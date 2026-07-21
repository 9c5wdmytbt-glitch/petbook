#!/usr/bin/env python3
"""Generate 3 original, validated 28x31 trench-network mazes for TRENCHFOX.

Engine invariants kept: tunnel row 14 wraps; dugout (ghost house) block at
rows 11-17 / cols 9-18 with door '-' at (13,12)(14,12); runner spawn at
(13,23)(14,23); fruit tile (13,17) open. Everything else is carved fresh
per seed with a randomised backtracker + loop-carving, then repaired to
full connectivity and validated. Layouts are original by construction.
"""
import random, json, sys
from collections import deque

W, H = 28, 31
HALF = 14

def generate(seed):
    rng = random.Random(seed)
    # half-grid: True = open corridor. Work on cols 0..13, mirror later.
    g = [[False] * HALF for _ in range(H)]

    # 1) recursive backtracker on odd lattice within rows 1..29, cols 1..13
    cells = [(r, c) for r in range(1, H - 1, 2) for c in range(1, HALF, 2)]
    start = (23, 13)  # near spawn corridor
    if start not in cells: start = cells[0]
    stack = [start]
    visited = {start}
    g[start[0]][start[1]] = True
    while stack:
        r, c = stack[-1]
        nbrs = []
        for dr, dc in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            nr, nc = r + dr, c + dc
            if 1 <= nr <= H - 2 and 1 <= nc <= HALF - 1 and (nr, nc) not in visited:
                nbrs.append((nr, nc))
        if nbrs:
            nr, nc = rng.choice(nbrs)
            g[(r + nr) // 2][(c + nc) // 2] = True
            g[nr][nc] = True
            visited.add((nr, nc))
            stack.append((nr, nc))
        else:
            stack.pop()

    # 2) carve extra loops so trenches interconnect (fewer dead ends)
    walls = [(r, c) for r in range(1, H - 1) for c in range(1, HALF)
             if not g[r][c]]
    rng.shuffle(walls)
    opened = 0
    for r, c in walls:
        n_open = sum(1 for dr, dc in ((1,0),(-1,0),(0,1),(0,-1))
                     if 0 <= r+dr < H and 0 <= c+dc < HALF and g[r+dr][c+dc])
        if n_open >= 2 and rng.random() < 0.35:
            g[r][c] = True
            opened += 1
        if opened > 46:
            break

    # 3) stamp fixed structures
    # tunnel row 14: open crawl-through to the left edge
    for c in range(0, HALF):
        g[14][c] = (c <= 8)  # cols 0-8 open, dugout wall handles 10+
    # dugout block rows 11-17, half cols 9-13:
    #   row11 corridor, row12 ' ###-' (c9 open, c10-12 wall, c13 door),
    #   rows13-15 ' #   ' (c9 open, c10 wall, 11-13 interior),
    #   row16 ' ####', row17 corridor
    for c in range(9, HALF): g[11][c] = True
    g[12][9] = True
    for c in (10, 11, 12): g[12][c] = False
    # c13 row12 = door, handled at render
    for r in (13, 14, 15):
        g[r][9] = True; g[r][10] = False
        for c in (11, 12, 13): g[r][c] = True
    g[16][9] = True
    for c in (10, 11, 12, 13): g[16][c] = False
    for c in range(9, HALF): g[17][c] = True
    # spawn corridor row 23: open cols 11..13 (mirror completes 14..16)
    for c in (11, 12, 13): g[23][c] = True
    # feed corridors so the stamped rows join the carved network
    for rr in (11, 17, 23):
        # walk left from col 9/11 carving until we touch carved corridor
        c = 9 if rr != 23 else 11
        while c > 1 and not g[rr][c - 1]:
            g[rr][c - 1] = True
            # stop early if the cell above/below is open (we joined a trench)
            if g[rr - 1][c - 1] or g[rr + 1][c - 1]:
                break
            c -= 1
    # tunnel row joins: ensure a vertical sap connects the tunnel (col 7-8)
    for r in (13, 15):
        g[r][8] = True
    g[12][8] = g[16][8] = g[11][8] = g[17][8] = True

    # borders closed (mirror col handles right side); row14 left edge stays open
    for r in range(H):
        g[r][0] = (r == 14)
    for c in range(HALF):
        g[0][c] = False
        g[H - 1][c] = False

    # 4) full-width grid via mirror
    full = [[g[r][c] if c < HALF else g[r][W - 1 - c] for c in range(W)]
            for r in range(H)]

    # 5) connectivity repair: BFS from spawn; carve any stranded region a
    #    path toward the centre column
    def bfs(open_at):
        seen = [[False] * W for _ in range(H)]
        q = deque([(23, 13)])
        seen[23][13] = True
        while q:
            r, c = q.popleft()
            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
                nr, nc = r + dr, (c + dc) % W if r == 14 else c + dc
                if 0 <= nr < H and 0 <= nc < W and not seen[nr][nc] and open_at(nr, nc):
                    seen[nr][nc] = True
                    q.append((nr, nc))
        return seen

    def openness(r, c):
        return full[r][c]

    for _ in range(200):
        seen = bfs(openness)
        stranded = [(r, c) for r in range(1, H - 1) for c in range(1, HALF)
                    if full[r][c] and not seen[r][c]
                    and not (11 <= r <= 16 and 10 <= c <= 17)]  # skip dugout interior
        if not stranded:
            break
        r, c = stranded[0]
        # carve toward spawn row: step vertically toward row 23 then horizontally
        rr, cc = r, c
        while not (seen[rr][cc]):
            if rr < 23: rr += 1
            elif rr > 23: rr -= 1
            else: cc += 1 if cc < 13 else -1
            if 11 <= rr <= 16 and 9 <= cc <= 18:  # never carve through the dugout
                rr = 17
                continue
            full[rr][cc] = True
            full[rr][W - 1 - cc] = True

    # 6) render to strings with pellets
    rows = []
    for r in range(H):
        row = []
        for c in range(W):
            if r == 12 and c in (13, 14):
                row.append('-')
            elif not full[r][c]:
                row.append('#')
            else:
                # blank zones: dugout surround, tunnel arms, spawn tiles, fruit lane
                if 11 <= r <= 17 and 9 <= c <= 18:
                    row.append(' ')
                elif r == 14 and (c < 6 or c > 21):
                    row.append(' ')
                elif r == 23 and c in (13, 14):
                    row.append(' ')
                elif (r + min(c, W - 1 - c)) % 2 == 0:
                    row.append('.')   # dispatches spaced along the trench (mirror-symmetric)
                else:
                    row.append(' ')
        rows.append(''.join(row))

    # 7) signal flares: four far-out pellet cells become 'o'
    def place_flare(rlo, rhi):
        for r in range(rlo, rhi):
            for c in range(1, 6):
                if rows[r][c] == '.':
                    rows[r] = rows[r][:c] + 'o' + rows[r][c+1:]
                    m = W - 1 - c
                    rows[r] = rows[r][:m] + 'o' + rows[r][m+1:]
                    return True
        return False
    assert place_flare(1, 8) and place_flare(24, 30)
    return rows

def validate(rows, label):
    errs = []
    if len(rows) != H or any(len(r) != W for r in rows):
        errs.append('bad dimensions')
    # borders
    if rows[0] != '#' * W or rows[H-1] != '#' * W: errs.append('open outer border row')
    for r in range(H):
        if r != 14 and (rows[r][0] != '#' or rows[r][W-1] != '#'):
            errs.append(f'open side border row {r}')
    if rows[14][0] == '#' or rows[14][W-1] == '#': errs.append('tunnel closed')
    # dugout invariants
    if rows[12][13] != '-' or rows[12][14] != '-': errs.append('door missing')
    for c in range(11, 17):
        if rows[14][c] not in ' ': errs.append('dugout interior blocked')
    if rows[11][12] == '#' or rows[11][13] == '#': errs.append('exit row blocked')
    if rows[17][13] == '#': errs.append('fruit tile blocked')
    if rows[23][13] != ' ' or rows[23][14] != ' ': errs.append('spawn not blank')
    if rows[23][12] == '#' and rows[23][15] == '#': errs.append('spawn sealed')
    # symmetry
    for r in range(H):
        m = rows[r].replace('-', '#')
        if m != m[::-1]: errs.append(f'asymmetric row {r}')
    # connectivity: every pellet reachable from spawn
    seen = [[False]*W for _ in range(H)]
    q = deque([(23, 13)]); seen[23][13] = True
    def passable(r, c):
        if r == 14 and (c < 0 or c >= W): return True
        return 0 <= r < H and 0 <= c < W and rows[r][c] not in '#-'
    while q:
        r, c = q.popleft()
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            nr, nc = r+dr, c+dc
            if nr == 14: nc %= W
            if passable(nr, nc) and not seen[nr][nc]:
                seen[nr][nc] = True; q.append((nr, nc))
    unreachable = [(r, c) for r in range(H) for c in range(W)
                   if rows[r][c] in '.o' and not seen[r][c]]
    if unreachable: errs.append(f'{len(unreachable)} unreachable pellets e.g. {unreachable[:4]}')
    dots = sum(row.count('.') + row.count('o') for row in rows)
    flares = sum(row.count('o') for row in rows)
    if flares != 4: errs.append(f'{flares} flares (want 4)')
    if dots < 100: errs.append(f'only {dots} dispatches')
    print(f'{label}: dots={dots} flares={flares} errors={errs or "NONE"}')
    return not errs

if __name__ == '__main__':
    good = []
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    tried = 0
    while len(good) < 3 and tried < 400:
        rows = generate(seed + tried)
        tried += 1
        if validate(rows, f'seed {seed + tried - 1}'):
            good.append(rows)
    if len(good) < 3:
        sys.exit('could not generate 3 valid mazes')
    with open('mazes.json', 'w') as f:
        json.dump(good, f)
    print('\n=== previews ===')
    for i, rows in enumerate(good):
        print(f'--- maze {i + 1} ---')
        print('\n'.join(rows))
