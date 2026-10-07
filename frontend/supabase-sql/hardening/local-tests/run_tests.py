"""Local access-rule tests for the Slate hardening patch.

Rebuilds a throwaway database from the production structure (no production rows),
seeds synthetic data, and checks what each kind of user can and cannot do:
  phase 0: production rules as they are today (expect the holes to be open)
  phase 1: after 10_additive.sql (old app queries must still work; follow data fixed)
  phase 2: after 20_tighten.sql (holes closed; every query the new app makes still works)
Every check runs in its own transaction and is rolled back unless noted.
"""
import json
import subprocess
import sys
from pathlib import Path

import psycopg

HERE = Path(__file__).resolve().parent
SQL = HERE.parent
CONN = "host=/tmp port=54329 user=postgres"
DB = "slate_test"

UID = {
    "A": "00000000-0000-0000-0000-00000000000a",
    "B": "00000000-0000-0000-0000-00000000000b",
    "G": "00000000-0000-0000-0000-00000000006a",
    "M": "00000000-0000-0000-0000-00000000000e",
    "X": "00000000-0000-0000-0000-0000000000ff",
    "C": "00000000-0000-0000-0000-00000000000c",
}
EMAIL = {
    "A": "server.a@test.dev", "B": "server.b@test.dev", "G": "guest.g@test.dev",
    "M": "manager.m@test.dev", "X": "attacker@test.dev", "C": "server.c@test.dev",
}
SRV_A = "11111111-1111-1111-1111-11111111111a"
SRV_B = "11111111-1111-1111-1111-11111111111b"
SRV_C = "11111111-1111-1111-1111-11111111111c"

results = []


def psql_file(path):
    subprocess.run(
        ["psql", "-h", "/tmp", "-p", "54329", "-U", "postgres", "-d", DB,
         "-v", "ON_ERROR_STOP=1", "-q", "-f", str(path)],
        check=True, capture_output=True, text=True,
    )


def rebuild():
    with psycopg.connect(CONN + " dbname=postgres", autocommit=True) as c:
        c.execute(f"drop database if exists {DB} with (force)")
        c.execute(f"create database {DB}")
    for f in ["00_supabase_shim.sql", "01_prod_baseline.sql", "02_seed.sql"]:
        psql_file(HERE / f)


def run_as(who, sql, params=None, commit=False):
    """Run sql as a Supabase role. who: 'anon', 'service', or a user key like 'G'."""
    with psycopg.connect(CONN + f" dbname={DB}") as c:
        with c.cursor() as cur:
            if who == "anon":
                claims, role = {"role": "anon"}, "anon"
            elif who == "service":
                claims, role = {"role": "service_role"}, "service_role"
            else:
                claims = {"sub": UID[who], "email": EMAIL[who], "role": "authenticated"}
                role = "authenticated"
            cur.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps(claims),))
            cur.execute(f"set local role {role}")
            # sql may be one statement, or a list of (statement, params) run in order;
            # the result of the last one is returned.
            steps = sql if isinstance(sql, list) else [(sql, params)]
            for stmt, stmt_params in steps:
                cur.execute(stmt, stmt_params)
            rows = cur.fetchall() if cur.description else None
            count = cur.rowcount
        if commit:
            c.commit()
        else:
            c.rollback()
    return rows, count


def admin(sql, params=None):
    with psycopg.connect(CONN + f" dbname={DB}") as c:
        r = c.execute(sql, params)
        return r.fetchall() if r.description else None


def check(phase, name, who, sql, expect, params=None, test=None, commit=False):
    """expect: 'ok' | 'denied' | 'zero' (statement runs but touches/returns no rows) | 'error'"""
    try:
        rows, count = run_as(who, sql, params, commit)
        if expect == "ok":
            passed = test(rows, count) if test else True
            got = f"ok rows={rows if rows is not None and len(str(rows)) < 120 else count}"
        elif expect == "zero":
            n = len(rows) if rows is not None else count
            passed = n == 0
            got = f"affected/returned {n}"
        else:
            passed = False
            got = f"succeeded rows={count}"
    except psycopg.Error as e:
        msg = str(e).splitlines()[0]
        if expect == "denied":
            passed = ("permission denied" in msg) or ("row-level security" in msg)
        elif expect == "error":
            passed = True
        else:
            passed = False
        got = f"error: {msg[:110]}"
    results.append((phase, name, passed, got))


# ---------------------------------------------------------------------------
def phase0():
    p = "0 today"
    check(p, "HOLE: anyone can read server emails", "anon",
          "select email from servers", "ok", test=lambda r, n: len(r) == 3)
    check(p, "HOLE: anyone can rewrite a reputation", "anon",
          "update servers set serve_balance_lifetime = 999999 where id = %s", "ok",
          params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "HOLE: anyone can delete ratings", "anon",
          "delete from ratings", "ok", test=lambda r, n: n == 1)
    check(p, "HOLE: anyone can read all notifications", "anon",
          "select recipient_email from notifications", "ok", test=lambda r, n: len(r) == 2)
    check(p, "BUG: guest cannot see own follows", "G",
          "select id from follows where follower_id = %s", "zero", params=(UID["G"],))


def phase1():
    p = "1 additive"
    # Follow data fixed
    check(p, "duplicate follow removed", "service",
          "select count(*) from follows where follower_id = %s and server_id = %s", "ok",
          params=(UID["G"], SRV_A), test=lambda r, n: r[0][0] == 1)
    check(p, "kept row is the approved one", "service",
          "select status from follows where follower_id = %s and server_id = %s", "ok",
          params=(UID["G"], SRV_A), test=lambda r, n: r[0][0] == "approved")
    check(p, "stuck pending on automatic server -> approved", "service",
          "select status from follows where follower_id = 'legacy-guest'", "ok",
          test=lambda r, n: r[0][0] == "approved")
    check(p, "follower_count recounted (was 7, real 2)", "service",
          "select follower_count from servers where id = %s", "ok",
          params=(SRV_A,), test=lambda r, n: r[0][0] == 2)
    # Old app code keeps working until part 2
    check(p, "old code: select * from servers still works", "anon",
          "select * from servers where id = %s", "ok", params=(SRV_A,), test=lambda r, n: len(r) == 1)
    check(p, "old code: rate page follower_count write still works", "G",
          "update servers set follower_count = follower_count where id = %s", "ok",
          params=(SRV_A,), test=lambda r, n: n == 1)
    # New behaviour already active
    check(p, "new follow on automatic server is approved", "service",
          "insert into follows (follower_id, server_id) values ('new-guest', %s) returning status", "ok",
          params=(SRV_A,), test=lambda r, n: r[0][0] == "approved")
    check(p, "new follow on approval server is pending", "service",
          "insert into follows (follower_id, server_id) values ('new-guest', %s) returning status", "ok",
          params=(SRV_B,), test=lambda r, n: r[0][0] == "pending")


def phase2():
    p = "2 tightened"
    # --- anonymous visitor ---
    check(p, "anon: public profile fields readable", "anon",
          "select id, name, photo_url, average_rating, follower_count from servers where id = %s", "ok",
          params=(SRV_A,), test=lambda r, n: len(r) == 1)
    for col in ["email", "phone"]:
        check(p, f"anon: servers.{col} hidden", "anon", f"select {col} from servers", "denied")
    check(p, "anon: select * on servers refused (app no longer uses it)", "anon",
          "select * from servers", "denied")
    check(p, "anon: cannot update any server", "anon",
          "update servers set bio = 'x'", "denied")
    check(p, "anon: cannot insert a server", "anon",
          "insert into servers (name) values ('fake')", "denied")
    check(p, "anon: ratings readable without email", "anon",
          "select id, score, comment, tags, guest_id from ratings", "ok", test=lambda r, n: len(r) == 1)
    check(p, "anon: ratings.guest_email hidden", "anon", "select guest_email from ratings", "denied")
    check(p, "anon: cannot insert ratings", "anon",
          "insert into ratings (server_id, score) values (%s, 5)", "denied", params=(SRV_A,))
    check(p, "anon: cannot delete ratings", "anon", "delete from ratings", "denied")
    check(p, "anon: cannot read follows", "anon", "select id from follows", "denied")
    check(p, "anon: cannot follow", "anon",
          "insert into follows (follower_id, server_id) values ('x', %s)", "denied", params=(SRV_A,))
    check(p, "anon: notifications hidden", "anon", "select id from notifications", "denied")
    check(p, "anon: manager emails hidden", "anon", "select email from restaurant_managers", "denied")
    check(p, "anon: venue names still public", "anon",
          "select restaurant_name from restaurant_managers", "ok", test=lambda r, n: len(r) == 1)
    check(p, "anon: restaurant waitlist insert works", "anon",
          "insert into restaurant_managers (email, name, restaurant_name, role) values ('w@test.dev','W','Bar W','owner')",
          "ok", test=lambda r, n: n == 1)
    check(p, "anon: cannot plant a manager row for someone else", "anon",
          "insert into restaurant_managers (email, restaurant_name, auth_id) values ('z@test.dev','Bar X', %s)",
          "denied", params=(UID["A"],))
    check(p, "anon: vibe reporter email hidden", "anon", "select reported_by from vibe_reports", "denied")
    check(p, "anon: vibe GPS hidden", "anon", "select user_lat from vibe_reports", "denied")
    check(p, "anon: vibe feed fields readable", "anon",
          "select id, restaurant_name, vibe, gps_verified, created_at from vibe_reports", "ok",
          test=lambda r, n: len(r) == 2)
    check(p, "anon: shift GPS hidden", "anon", "select user_lat from shifts", "denied")
    check(p, "anon: who's working tonight readable", "anon",
          "select id, server_id, restaurant_name, started_at from shifts where is_active", "ok",
          test=lambda r, n: len(r) == 1)
    check(p, "anon: cannot start a shift", "anon",
          "insert into shifts (server_id, restaurant_name) values (%s, 'Bar X')", "denied", params=(SRV_A,))
    check(p, "anon: guest rewards hidden", "anon", "select email from guest_rewards", "denied")
    check(p, "anon: comment emails hidden", "anon", "select commenter_email from venue_comments", "denied")
    check(p, "anon: can post a venue comment", "anon",
          "insert into venue_comments (restaurant_name, comment, commenter_name) values ('Bar X','hi','N')",
          "ok", test=lambda r, n: n == 1)
    check(p, "anon: cannot edit comments directly", "anon",
          "update venue_comments set likes = 1000", "denied")
    check(p, "anon: like via function adds exactly 1", "anon",
          "select like_venue_comment('33333333-3333-3333-3333-333333333333')", "ok",
          test=lambda r, n: r[0][0] == 1)
    check(p, "anon: QR scans table closed", "anon", "select id from qr_scans", "denied")
    check(p, "anon: $SERVE function locked", "anon",
          "select increment_serve_balance('%%', 1000, 'server')", "denied")
    check(p, "anon: approve function locked", "anon",
          "select approve_follow_request(gen_random_uuid(), %s)", "denied", params=(SRV_A,))

    # --- signed-in guest G ---
    check(p, "guest: sees own follows", "G",
          "select server_id, status from follows where follower_id = %s", "ok",
          params=(UID["G"],), test=lambda r, n: len(r) == 1 and r[0][1] == "approved")
    check(p, "guest: cannot see others' follows", "G",
          "select id from follows where follower_id <> %s", "zero", params=(UID["G"],))
    check(p, "guest: follow approval-server -> pending", "G",
          "insert into follows (follower_id, follower_email, server_id, follower_type) values (%s, %s, %s, 'guest') returning status",
          "ok", params=(UID["G"], EMAIL["G"], SRV_B), test=lambda r, n: r[0][0] == "pending")
    check(p, "guest: following twice is rejected", "G",
          "insert into follows (follower_id, server_id) values (%s, %s)", "error", params=(UID["G"], SRV_A))
    check(p, "guest: cannot choose own status", "G",
          "insert into follows (follower_id, server_id, status) values (%s, %s, 'approved')", "denied",
          params=(UID["G"], SRV_B))
    check(p, "guest: cannot follow as someone else", "G",
          "insert into follows (follower_id, server_id) values (%s, %s)", "denied", params=(UID["X"], SRV_B))
    check(p, "guest: unfollow lowers follower_count", "G",
          [("delete from follows where follower_id = %s and server_id = %s", (UID["G"], SRV_A)),
           ("select follower_count from servers where id = %s", (SRV_A,))],
          "ok", test=lambda r, n: r[0][0] == 1)
    check(p, "guest: cannot change a follower_count", "G",
          "update servers set follower_count = 500 where id = %s", "denied", params=(SRV_A,))
    check(p, "guest: cannot edit someone's profile", "G",
          "update servers set bio = 'hacked' where id = %s", "zero", params=(SRV_A,))
    check(p, "guest: own notifications only", "G",
          "select recipient_email from notifications", "ok",
          test=lambda r, n: [x[0] for x in r] == [EMAIL["G"]])
    check(p, "guest: mark own notification read", "G",
          "update notifications set is_read = true where recipient_email = %s", "ok",
          params=(EMAIL["G"],), test=lambda r, n: n == 1)
    check(p, "guest: cannot mark others' notifications", "G",
          "update notifications set is_read = true where recipient_email <> %s", "zero", params=(EMAIL["G"],))
    check(p, "guest: own reward balance only", "G",
          "select email, slate_points from guest_rewards", "ok",
          test=lambda r, n: r == [(EMAIL["G"], 5)])
    check(p, "guest: own vibe reports via function", "G",
          "select vibe from my_vibe_reports()", "ok", test=lambda r, n: [x[0] for x in r] == ["Live"])
    check(p, "guest: cannot start a shift for a server", "G",
          "insert into shifts (server_id, restaurant_name) values (%s, 'Bar X')", "denied", params=(SRV_A,))
    check(p, "guest: link_my_server finds nothing", "G",
          "select * from link_my_server()", "zero")

    # --- server A ---
    check(p, "server: edit own settings", "A",
          "update servers set specialties = array['Wine'], profile_visibility = 'public' where id = %s", "ok",
          params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "server: photo update reading back id/photo_url", "A",
          "update servers set photo_url = 'p.jpg' where wallet_address = %s returning id, photo_url", "ok",
          params=(UID["A"],), test=lambda r, n: n == 1)
    check(p, "server: cannot edit another server", "A",
          "update servers set bio = 'x' where id = %s", "zero", params=(SRV_B,))
    for col in ["follower_count", "serve_balance_lifetime", "average_rating", "is_test", "wallet_address"]:
        check(p, f"server: cannot set own {col}", "A",
              f"update servers set {col} = {col} where id = %s", "denied", params=(SRV_A,))
    check(p, "server: start own shift", "A",
          "insert into shifts (server_id, restaurant_name, is_active, activated_by, user_lat, user_lng) values (%s, 'Bar X', true, 'server', 40.7, -73.9)",
          "ok", params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "server: start shift reading back id", "A",
          "insert into shifts (server_id, restaurant_name) values (%s, 'Bar X') returning id",
          "ok", params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "server: end own shift", "A",
          "update shifts set is_active = false, ended_at = now() where server_id = %s", "ok",
          params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "server: cannot start someone else's shift", "A",
          "insert into shifts (server_id, restaurant_name) values (%s, 'Bar Y')", "denied", params=(SRV_B,))
    check(p, "server: add own job", "A",
          "insert into server_restaurants (server_id, restaurant_name) values (%s, 'Bar Z')", "ok",
          params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "server: cannot add a job to another server", "A",
          "insert into server_restaurants (server_id, restaurant_name) values (%s, 'Bar Z')", "denied",
          params=(SRV_B,))
    check(p, "server: sees own followers", "A",
          "select follower_id from follows where server_id = %s", "ok",
          params=(SRV_A,), test=lambda r, n: len(r) == 2)
    check(p, "server: cannot follow self", "A",
          "insert into follows (follower_id, server_id) values (%s, %s)", "error", params=(UID["A"], SRV_A))
    check(p, "server: submit own suggestion", "A",
          "insert into suggestions (server_id, server_name, title) values (%s, 'Ana', 'Idea')", "ok",
          params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "server: suggestion as the dashboard sends it (status pending)", "A",
          "insert into suggestions (server_id, title, description, status) values (%s, 'Idea', 'd', 'pending')", "ok",
          params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "server: cannot pre-approve own suggestion", "A",
          "insert into suggestions (server_id, title, status) values (%s, 'Idea', 'approved')", "denied",
          params=(SRV_A,))
    check(p, "server: cannot suggest as another server", "A",
          "insert into suggestions (server_id, title) values (%s, 'Idea')", "denied", params=(SRV_B,))
    check(p, "server: link_my_server returns own row", "A",
          "select id from link_my_server()", "ok", test=lambda r, n: str(r[0][0]) == SRV_A)

    # --- manager M of Bar X ---
    check(p, "manager: put own staff on shift", "M",
          "insert into shifts (server_id, restaurant_name, is_active, activated_by) values (%s, 'Bar X', true, 'manager')",
          "ok", params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "manager: end own staff's shift", "M",
          "update shifts set is_active = false, ended_at = now() where server_id = %s and restaurant_name = 'Bar X' and is_active",
          "ok", params=(SRV_A,), test=lambda r, n: n == 1)
    check(p, "manager: cannot shift a server who doesn't work there", "M",
          "insert into shifts (server_id, restaurant_name) values (%s, 'Bar X')", "denied", params=(SRV_B,))
    check(p, "manager: cannot shift staff at another venue", "M",
          "insert into shifts (server_id, restaurant_name) values (%s, 'Bar Y')", "denied", params=(SRV_A,))
    check(p, "manager: link_my_manager returns own row", "M",
          "select restaurant_name from link_my_manager()", "ok", test=lambda r, n: r[0][0] == "Bar X")
    check(p, "manager: own row fields without email", "M",
          "select id, name, restaurant_name, auth_id, role from restaurant_managers where auth_id = %s", "ok",
          params=(UID["M"],), test=lambda r, n: len(r) == 1)

    # --- attacker X (signed in, no profile) ---
    check(p, "attacker: cannot rewrite reputations", "X",
          "update servers set bio = 'x'", "zero")
    check(p, "attacker: cannot delete ratings", "X", "delete from ratings", "denied")
    check(p, "attacker: cannot create shifts", "X",
          "insert into shifts (server_id, restaurant_name) values (%s, 'Bar X')", "denied", params=(SRV_A,))
    check(p, "attacker: cannot take over a manager row", "X",
          "update restaurant_managers set auth_id = %s", "denied", params=(UID["X"],))
    check(p, "attacker: no one else's notifications", "X", "select id from notifications", "zero")

    # --- account linking ---
    check(p, "legacy server C links by verified email", "C",
          "select id from link_my_server()", "ok", test=lambda r, n: str(r[0][0]) == SRV_C)

    # --- server-side flows (service key) ---
    check(p, "service: submit_rating_reward still works", "service",
          "select submit_rating_reward(%s, 5, 'great', array['Friendly'], 'g@test.dev', false, 45)", "ok",
          params=(SRV_A,), test=lambda r, n: r[0][0]["amount"] == 45)

    # Approve and block flow, cumulative (committed)
    run_as("G", "insert into follows (follower_id, follower_email, server_id) values (%s, %s, %s)",
           (UID["G"], EMAIL["G"], SRV_B), commit=True)
    fid = admin("select id from follows where follower_id = %s and server_id = %s", (UID["G"], SRV_B))[0][0]
    count_b = ("select follower_count from servers where id = %s", (SRV_B,))
    check(p, "service: approve pending follow -> count 1", "service",
          [("select approve_follow_request(%s, %s)", (fid, SRV_B)), count_b],
          "ok", test=lambda r, n: r[0][0] == 1, commit=True)
    check(p, "service: approving again does not double count", "service",
          [("select approve_follow_request(%s, %s)", (fid, SRV_B)), count_b],
          "ok", test=lambda r, n: r[0][0] == 1)
    check(p, "service: block_follower exists, count back to 0", "service",
          [("select block_follower(%s, %s)", (fid, SRV_B)), count_b],
          "ok", test=lambda r, n: r[0][0] == 0, commit=True)
    check(p, "blocked guest cannot delete the block", "G",
          "delete from follows where id = %s", "zero", params=(fid,))
    check(p, "blocked guest cannot re-follow", "G",
          "insert into follows (follower_id, server_id) values (%s, %s)", "error", params=(UID["G"], SRV_B))
    check(p, "approve/block not callable by browsers", "B",
          "select block_follower(%s, %s)", "denied", params=(fid, SRV_B))


def phase3():
    p = "3 rollback"
    psql_file(SQL / "29_rollback_tighten.sql")
    check(p, "rollback 2: today's open rules restored (28)", "service",
          "select count(*) from pg_policies where schemaname = 'public'", "ok", test=lambda r, n: r[0][0] == 28)
    check(p, "rollback 2: old select * works again", "anon",
          "select * from servers", "ok", test=lambda r, n: len(r) == 3)
    psql_file(SQL / "19_rollback_additive.sql")
    check(p, "rollback 1: duplicate follow back", "service",
          "select count(*) from follows where follower_id = %s and server_id = %s", "ok",
          params=(UID["G"], SRV_A), test=lambda r, n: r[0][0] == 2)
    check(p, "rollback 1: stuck pending row back", "service",
          "select status from follows where follower_id = 'legacy-guest'", "ok",
          test=lambda r, n: r[0][0] == "pending")
    check(p, "rollback 1: follower_count back to 7", "service",
          "select follower_count from servers where id = %s", "ok", params=(SRV_A,), test=lambda r, n: r[0][0] == 7)
    check(p, "rollback 1: new functions removed", "service",
          "select count(*) from pg_proc where proname in ('link_my_server','follows_set_status','block_follower')",
          "ok", test=lambda r, n: r[0][0] == 0)


def main():
    rebuild()
    phase0()
    rebuild()
    psql_file(SQL / "10_additive.sql")
    phase1()
    psql_file(SQL / "20_tighten.sql")
    phase2()
    phase3()
    width = max(len(r[1]) for r in results)
    fails = 0
    for phase, name, ok, got in results:
        fails += not ok
        print(f"{'PASS' if ok else 'FAIL'}  [{phase}] {name.ljust(width)}  {got}")
    print(f"\n{len(results) - fails}/{len(results)} passed")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
