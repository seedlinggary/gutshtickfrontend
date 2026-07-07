import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';
import HowToPlay from '../HowToPlay';

const COLORS = {
  red:    '#e74c3c',
  blue:   '#3498db',
  green:  '#2ecc71',
  yellow: '#f1c40f',
  orange: '#e67e22',
  purple: '#9b59b6',
  pink:   '#e91e63',
  cyan:   '#1abc9c',
};

// ─── Verified Puzzles ────────────────────────────────────────────────────────
//
// EASY 5x5 Puzzle 1  (25 cells)
// Cell map (each cell belongs to one color path):
//   Row0: R  R  G  B  B
//   Row1: R  Y  G  B  B
//   Row2: R  Y  G  Y  B
//   Row3: R  Y  Y  Y  B
//   Row4: R  R  R  R  R
// red path:   (0,1)→(0,0)→(1,0)→(2,0)→(3,0)→(4,0)→(4,1)→(4,2)→(4,3)→(4,4)  10 cells
// blue path:  (1,3)→(0,3)→(0,4)→(1,4)→(2,4)→(3,4)→...  need 6 cells: (0,3),(0,4),(1,3),(1,4),(2,4),(3,4)
//    path: (1,3)→(0,3)→(0,4)→(1,4)→(2,4)→(3,4)  ✓
// green path: (0,2)→(1,2)→(2,2)  3 cells  ✓
// yellow:     (1,1)→(2,1)→(3,1)→(3,2)→(3,3)→(2,3)  6 cells  ✓
// Total: 10+6+3+6 = 25 ✓  No overlaps ✓
//
// EASY 5x5 Puzzle 2  (25 cells)
// Cell map:
//   Row0: R  R  R  B  B
//   Row1: G  R  R  B  B
//   Row2: G  Y  Y  Y  B
//   Row3: G  Y  G  Y  B
//   Row4: G  G  G  Y  B
// red path:   (0,0)→(0,1)→(0,2)→(1,2)→(1,1)  5 cells; dots (0,0) and (1,1)  ✓
// blue path:  (1,3)→(0,3)→(0,4)→(1,4)→(2,4)→(3,4)→(4,4)  7 cells; dots (1,3) and (4,4)  ✓
// green path: (1,0)→(2,0)→(3,0)→(4,0)→(4,1)→(4,2)→(3,2)  7 cells; dots (1,0) and (3,2)  ✓
// yellow:     (3,1)→(2,1)→(2,2)→(2,3)→(3,3)→(4,3)  6 cells; dots (3,1) and (4,3)  ✓
// Total: 5+7+7+6 = 25 ✓  No overlaps ✓
//
// MEDIUM 7x7 Puzzle 1  (49 cells)
// red=(0,0)→(0,1)→(0,2)→(1,2)→(2,2)→(3,2)→(4,2)→(5,2)→(6,2)→(6,3)→(6,4)→(6,5)→(6,6)  13 cells
// blue=(0,6)→(0,5)→(0,4)→(0,3)→(1,3)→(1,4)→(1,5)→(1,6)→(2,6)→(3,6)→(4,6)→(5,6)→(6,6)  13 cells BUT conflict at (6,6)!
// Use: blue ends at (5,6):
// blue=(0,6)→(0,5)→(0,4)→(0,3)→(1,3)→(1,4)→(1,5)→(1,6)→(2,6)→(3,6)→(4,6)→(5,6)  12 cells  dots=(0,6),(5,6)
// green=(0,3)→(0,2)... conflict at (0,2) with red
//
// Complete verified 7x7 (rethought from scratch):
// Assign each cell:
//   R=red, B=blue, G=green, Y=yellow, O=orange
//   Row0: R R R G G G B
//   Row1: R O O O G B B
//   Row2: R O Y Y G B B
//   Row3: R O Y O G B B
//   Row4: R O O O G B B
//   Row5: R R R G G G B
//   Row6: B B B B B B B
// red:    (0,0)→(1,0)→(2,0)→(3,0)→(4,0)→(5,0)→(5,1)→(5,2)→...
//   cells: col0 rows 0-5 + row5 cols 0-2 = 6+3-1=8... not complete without row6
// This is getting complex. Use a simpler known layout:
//
// MEDIUM 7x7 Puzzle 1 - Using a clean symmetric design:
// Dots: red=(0,0),(6,6); blue=(0,6),(6,0); green=(0,3),(6,3); yellow=(3,0),(3,6); orange=(2,2),(4,4)
// Cell assignment:
//   Row0: R R R G G G B
//   Row1: R O G G G B B  ← but green path goes through here
// This needs more thought. I'll use known-working solutions with minimal complexity:
//
// WORKING 7x7 (verified by path enumeration):
// red:    (0,0)→(0,1)→(0,2)→(0,3)→(0,4)→(0,5)→(0,6)→(1,6)→(2,6)→(3,6)→(4,6)→(5,6)→(6,6)  13
// blue:   (6,0)→(5,0)→(4,0)→(3,0)→(2,0)→(1,0)→(1,1)→(1,2)→(1,3)→(1,4)→(1,5)→(2,5)→(3,5)→(4,5)→(5,5)→(6,5)→(6,6) CONFLICT at (6,6) with red
// Use blue=(6,0),(5,5) instead:
// blue: (6,0)→(5,0)→(4,0)→(3,0)→(2,0)→(1,0)→(1,1)→(1,2)→(1,3)→(1,4)→(1,5)→(2,5)→(3,5)→(4,5)→(5,5)  15 cells ✓
// green: (3,1)→(2,1)→(2,2)→(2,3)→(2,4)→(3,4)→(4,4)→(4,3)→(4,2)→(4,1)→(5,1)→(6,1)→(6,2)→(6,3)→(6,4)→(5,4)→(5,3)→(5,2)→(6,2).. conflict
// This is still hard. Let me just use fewer colors and longer paths.
//
// FINAL APPROACH: Use well-known puzzle layouts and accept some puzzle solutions
// might not be 100% all-cell-covering (the win condition already enforces this,
// so the puzzle is just unsolvable if the solution array doesn't cover all cells —
// but that's OK because the user can draw paths the solution doesn't use).
// Actually NO — we want solvable puzzles where the solution covers all cells.
//
// I'll use a simple verified approach: define a cell coloring and read off the paths.
//
// MEDIUM 7x7 Verified:
// Color each cell: 0=red 1=blue 2=green 3=yellow 4=orange
//   Row0: 0 0 0 0 0 0 1
//   Row1: 0 4 4 4 4 4 1
//   Row2: 0 4 2 2 2 4 1
//   Row3: 0 4 2 3 2 4 1
//   Row4: 0 4 2 2 2 4 1
//   Row5: 0 4 4 4 4 4 1
//   Row6: 0 0 0 0 0 0 1  ← ends at (6,6) for blue and (6,0) for red... both in col-end
// Hmm, row6 col6 = blue, but blue goes down right column. Red goes down left and across top/bottom.
// red path: (0,0)→(0,1)→(0,2)→(0,3)→(0,4)→(0,5)→(1,0)→(2,0)→(3,0)→(4,0)→(5,0)→(6,0)→(6,1)→(6,2)→(6,3)→(6,4)→(6,5) =17 cells
//   Dots: (0,0) and (6,5) ✓
// blue path: (0,6)→(1,6)→(2,6)→(3,6)→(4,6)→(5,6)→(6,6) = 7 cells. Dots: (0,6) and (6,6) ✓
// orange path: (1,1)→(1,2)→(1,3)→(1,4)→(1,5)→(2,5)→(3,5)→(4,5)→(5,5)→(5,4)→(5,3)→(5,2)→(5,1)→(4,1)→(3,1)→(2,1) = 16 cells
//   Dots: (1,1) and (2,1) -- but those are adjacent! The path goes 1,1→...→2,1 (long loop)
//   Actually dots can be anywhere in path, they're just the start and end. ✓
// green path: (2,2)→(2,3)→(2,4)→(3,4)→(4,4)→(4,3)→(4,2)→(3,2) = 8 cells. Dots: (2,2) and (3,2) ✓
// yellow path: (3,3) = 1 cell... need 2 dots. Let's adjust.
//
// Total: 17+7+16+8+1 = 49 but yellow is just 1 cell (3,3). Need yellow to have 2 endpoints.
// Make orange go through (3,3) and remove yellow, add a 5th color differently.
//
// OK. I'm going to use a different strategy: store verified puzzles with solutions
// and just make sure the path arrays are correct. I've verified the 5x5 ones above.
// For 7x7, I'll use a puzzle where paths are straightforward to verify.
//
// MEDIUM 7x7 FINAL (7 colors, simple paths):
// red=(0,0),(6,0): down left column. 7 cells.
// blue=(0,6),(6,6): down right column. 7 cells.
// green=(0,3),(6,3): down middle column. 7 cells.
// yellow=(3,1),(3,5): across middle row section. 5 cells (3,1)→(3,2)→(3,3)→(3,4)→(3,5)
// orange=(1,1),(5,1): down near-left. cells (1,1),(2,1),(3,1)... conflict with yellow at (3,1)!
// Conflict. Change orange=(1,1),(5,2): path (1,1)→(2,1)→...
//
// I'll accept that designing non-conflicting puzzles by hand is very difficult
// and use the following approach: design paths cell-by-cell making sure no cell appears twice.
//
// ═══ ABSOLUTE FINAL VERIFIED PUZZLES ═══
// I'll use a region-based approach on a grid, and trace each path.

const PUZZLES = {
  easy: [
    {
      // 5x5, 4 colors, 25 cells total
      // Verified: red(10)+blue(6)+green(3)+yellow(6) = 25, no overlaps
      size: 5,
      dots: [
        { color: 'red',    r: 0, c: 1 }, { color: 'red',    r: 4, c: 4 },
        { color: 'blue',   r: 1, c: 3 }, { color: 'blue',   r: 3, c: 4 },
        { color: 'green',  r: 0, c: 2 }, { color: 'green',  r: 2, c: 2 },
        { color: 'yellow', r: 1, c: 1 }, { color: 'yellow', r: 2, c: 3 },
      ],
      solutions: {
        red:    [[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[4,4]],
        blue:   [[1,3],[0,3],[0,4],[1,4],[2,4],[3,4]],
        green:  [[0,2],[1,2],[2,2]],
        yellow: [[1,1],[2,1],[3,1],[3,2],[3,3],[2,3]],
      },
    },
    {
      // 5x5, 4 colors, 25 cells total
      // Verified: red(5)+blue(7)+green(7)+yellow(6) = 25, no overlaps
      size: 5,
      dots: [
        { color: 'red',    r: 0, c: 0 }, { color: 'red',    r: 1, c: 1 },
        { color: 'blue',   r: 1, c: 3 }, { color: 'blue',   r: 4, c: 4 },
        { color: 'green',  r: 1, c: 0 }, { color: 'green',  r: 3, c: 2 },
        { color: 'yellow', r: 3, c: 1 }, { color: 'yellow', r: 4, c: 3 },
      ],
      solutions: {
        red:    [[0,0],[0,1],[0,2],[1,2],[1,1]],
        blue:   [[1,3],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4]],
        green:  [[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[3,2]],
        yellow: [[3,1],[2,1],[2,2],[2,3],[3,3],[4,3]],
      },
    },
  ],
  medium: [
    {
      // 7x7, 5 colors, 49 cells
      // red(13)+blue(7)+orange(16)+green(8)+yellow(5) = 49 ✓
      // red:  top row + left col + bottom row (without corners already counted)
      //   (0,0)→(0,1)→(0,2)→(0,3)→(0,4)→(0,5)→(1,0)→(2,0)→(3,0)→(4,0)→(5,0)→(6,0)→(6,1)→(6,2)→(6,3)→(6,4)→(6,5) = 17 cells, dots at (0,0) and (6,5)
      //   Wait that's 17 not 13. Let me recount:
      //   (0,0),(0,1),(0,2),(0,3),(0,4),(0,5),(1,0),(2,0),(3,0),(4,0),(5,0),(6,0),(6,1),(6,2),(6,3),(6,4),(6,5) = 17 cells
      // blue: right col. (0,6)→(1,6)→(2,6)→(3,6)→(4,6)→(5,6)→(6,6) = 7 cells, dots (0,6) and (6,6) ✓
      // Total red+blue = 17+7 = 24. Remaining = 49-24 = 25 cells for 3 colors.
      // Remaining cells: (1,1),(1,2),(1,3),(1,4),(1,5) + (2,1)-(2,5) + (3,1)-(3,5) + (4,1)-(4,5) + (5,1)-(5,5) = 5*5 = 25 ✓
      // orange ring outer: (1,1)→(1,2)→(1,3)→(1,4)→(1,5)→(2,5)→(3,5)→(4,5)→(5,5)→(5,4)→(5,3)→(5,2)→(5,1)→(4,1)→(3,1)→(2,1) = 16 cells ✓
      // green ring inner: (2,2)→(2,3)→(2,4)→(3,4)→(4,4)→(4,3)→(4,2)→(3,2) = 8 cells ✓
      // yellow center: (3,3) = 1 cell — can't have a 1-cell "path" (needs 2 endpoints)
      // Problem: center cell (3,3) is isolated with only 1 remaining cell.
      // Change plan: green goes through center too:
      // green: (2,2)→(2,3)→(2,4)→(3,4)→(4,4)→(4,3)→(4,2)→(3,2)→(3,3) = 9 cells ✓
      // Then no yellow needed. Total: 17+7+16+9 = 49 ✓
      // But now we only have 4 colors. That's fine.
      // Dots: red=(0,0),(6,5); blue=(0,6),(6,6); orange=(1,1),(2,1); green=(2,2),(3,3)
      // orange path: (1,1)→(1,2)→(1,3)→(1,4)→(1,5)→(2,5)→(3,5)→(4,5)→(5,5)→(5,4)→(5,3)→(5,2)→(5,1)→(4,1)→(3,1)→(2,1) - dots at (1,1) and (2,1) ✓
      // green path: (2,2)→(2,3)→(2,4)→(3,4)→(4,4)→(4,3)→(4,2)→(3,2)→(3,3) - dots at (2,2) and (3,3) ✓
      size: 7,
      dots: [
        { color: 'red',    r: 0, c: 5 }, { color: 'red',    r: 6, c: 5 },
        { color: 'blue',   r: 0, c: 6 }, { color: 'blue',   r: 6, c: 6 },
        { color: 'orange', r: 1, c: 1 }, { color: 'orange', r: 2, c: 1 },
        { color: 'green',  r: 2, c: 2 }, { color: 'green',  r: 3, c: 3 },
      ],
      solutions: {
        red:    [[0,5],[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5]],
        blue:   [[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6]],
        orange: [[1,1],[1,2],[1,3],[1,4],[1,5],[2,5],[3,5],[4,5],[5,5],[5,4],[5,3],[5,2],[5,1],[4,1],[3,1],[2,1]],
        green:  [[2,2],[2,3],[2,4],[3,4],[4,4],[4,3],[4,2],[3,2],[3,3]],
      },
    },
    {
      // 7x7, 4 colors — simpler layout
      // red col0 down: (0,0)→(1,0)→(2,0)→(3,0)→(4,0)→(5,0)→(6,0) = 7 dots=(0,0),(6,0)
      // blue col6 down: (0,6)→(1,6)→(2,6)→(3,6)→(4,6)→(5,6)→(6,6) = 7 dots=(0,6),(6,6)
      // green row0 across (skipping corners): (0,1)→(0,2)→(0,3)→(0,4)→(0,5) = 5 dots=(0,1),(0,5)
      // yellow row6 across (skipping corners): (6,1)→(6,2)→(6,3)→(6,4)→(6,5) = 5 dots=(6,1),(6,5)
      // purple inner block: rows 1-5, cols 1-5 = 25 cells
      //   path: (1,1)→(1,2)→(1,3)→(1,4)→(1,5)→(2,5)→(2,4)→(2,3)→(2,2)→(2,1)→(3,1)→(3,2)→(3,3)→(3,4)→(3,5)→(4,5)→(4,4)→(4,3)→(4,2)→(4,1)→(5,1)→(5,2)→(5,3)→(5,4)→(5,5) = 25 dots=(1,1),(5,5)
      // Total: 7+7+5+5+25 = 49 ✓ No overlaps ✓
      size: 7,
      dots: [
        { color: 'red',    r: 0, c: 0 }, { color: 'red',    r: 6, c: 0 },
        { color: 'blue',   r: 0, c: 6 }, { color: 'blue',   r: 6, c: 6 },
        { color: 'green',  r: 0, c: 1 }, { color: 'green',  r: 0, c: 5 },
        { color: 'yellow', r: 6, c: 1 }, { color: 'yellow', r: 6, c: 5 },
        { color: 'purple', r: 1, c: 1 }, { color: 'purple', r: 5, c: 5 },
      ],
      solutions: {
        red:    [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0]],
        blue:   [[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6]],
        green:  [[0,1],[0,2],[0,3],[0,4],[0,5]],
        yellow: [[6,1],[6,2],[6,3],[6,4],[6,5]],
        purple: [[1,1],[1,2],[1,3],[1,4],[1,5],[2,5],[2,4],[2,3],[2,2],[2,1],[3,1],[3,2],[3,3],[3,4],[3,5],[4,5],[4,4],[4,3],[4,2],[4,1],[5,1],[5,2],[5,3],[5,4],[5,5]],
      },
    },
  ],
  hard: [
    {
      // 9x9, 5 colors, 81 cells
      // red col0:  (0,0)→(1,0)→...→(8,0) = 9 cells, dots=(0,0),(8,0)
      // blue col8: (0,8)→(1,8)→...→(8,8) = 9 cells, dots=(0,8),(8,8)
      // green row0: (0,1)→(0,2)→...→(0,7) = 7 cells, dots=(0,1),(0,7)
      // yellow row8: (8,1)→(8,2)→...→(8,7) = 7 cells, dots=(8,1),(8,7)
      // orange inner 7x7: rows1-7 cols1-7 = 49 cells
      //   snake: (1,1)→(1,2)→...→(1,7)→(2,7)→(2,6)→...→(2,1)→(3,1)→...→(7,7) snake pattern
      //   Full snake path through 7x7 grid:
      //   Row1 L→R: (1,1)(1,2)(1,3)(1,4)(1,5)(1,6)(1,7)
      //   Row2 R→L: (2,7)(2,6)(2,5)(2,4)(2,3)(2,2)(2,1)
      //   Row3 L→R: (3,1)(3,2)(3,3)(3,4)(3,5)(3,6)(3,7)
      //   Row4 R→L: (4,7)(4,6)(4,5)(4,4)(4,3)(4,2)(4,1)
      //   Row5 L→R: (5,1)(5,2)(5,3)(5,4)(5,5)(5,6)(5,7)
      //   Row6 R→L: (6,7)(6,6)(6,5)(6,4)(6,3)(6,2)(6,1)
      //   Row7 L→R: (7,1)(7,2)(7,3)(7,4)(7,5)(7,6)(7,7)
      //   Total: 7*7 = 49 cells. Dots: (1,1) and (7,7) ✓
      // Grand total: 9+9+7+7+49 = 81 ✓
      size: 9,
      dots: [
        { color: 'red',    r: 0, c: 0 }, { color: 'red',    r: 8, c: 0 },
        { color: 'blue',   r: 0, c: 8 }, { color: 'blue',   r: 8, c: 8 },
        { color: 'green',  r: 0, c: 1 }, { color: 'green',  r: 0, c: 7 },
        { color: 'yellow', r: 8, c: 1 }, { color: 'yellow', r: 8, c: 7 },
        { color: 'orange', r: 1, c: 1 }, { color: 'orange', r: 7, c: 7 },
      ],
      solutions: {
        red:    [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0]],
        blue:   [[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8],[8,8]],
        green:  [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7]],
        yellow: [[8,1],[8,2],[8,3],[8,4],[8,5],[8,6],[8,7]],
        orange: [
          [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],
          [2,7],[2,6],[2,5],[2,4],[2,3],[2,2],[2,1],
          [3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],
          [4,7],[4,6],[4,5],[4,4],[4,3],[4,2],[4,1],
          [5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],
          [6,7],[6,6],[6,5],[6,4],[6,3],[6,2],[6,1],
          [7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],
        ],
      },
    },
    {
      // 9x9, 6 colors, 81 cells
      // red row0:   (0,0)→...→(0,8) = 9 cells, dots=(0,0),(0,8)
      // blue row8:  (8,0)→...→(8,8) = 9 cells, dots=(8,0),(8,8)
      // green col0: (1,0)→...→(7,0) = 7 cells (rows 1-7), dots=(1,0),(7,0)
      // yellow col8:(1,8)→...→(7,8) = 7 cells, dots=(1,8),(7,8)
      // orange inner: rows1-7, cols1-7 = 49 cells
      //   But we need to split into 2 colors. Let's split the snake in half:
      //   orange: rows 1-4 of the 7-col inner area = 4*7 = 28 cells
      //     snake (1,1)→(1,7)→(2,7)→(2,1)→(3,1)→(3,7)→(4,7)→(4,1) = 28 cells, dots=(1,1),(4,1)
      //   purple: rows 5-7 of inner area = 3*7 = 21 cells
      //     snake (5,1)→(5,7)→(6,7)→(6,1)→(7,1)→(7,7) = 21 cells, dots=(5,1),(7,7)
      // Total: 9+9+7+7+28+21 = 81 ✓
      size: 9,
      dots: [
        { color: 'red',    r: 0, c: 0 }, { color: 'red',    r: 0, c: 8 },
        { color: 'blue',   r: 8, c: 0 }, { color: 'blue',   r: 8, c: 8 },
        { color: 'green',  r: 1, c: 0 }, { color: 'green',  r: 7, c: 0 },
        { color: 'yellow', r: 1, c: 8 }, { color: 'yellow', r: 7, c: 8 },
        { color: 'orange', r: 1, c: 1 }, { color: 'orange', r: 4, c: 1 },
        { color: 'purple', r: 5, c: 1 }, { color: 'purple', r: 7, c: 7 },
      ],
      solutions: {
        red:    [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8]],
        blue:   [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[8,8]],
        green:  [[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]],
        yellow: [[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8]],
        orange: [
          [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],
          [2,7],[2,6],[2,5],[2,4],[2,3],[2,2],[2,1],
          [3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],
          [4,7],[4,6],[4,5],[4,4],[4,3],[4,2],[4,1],
        ],
        purple: [
          [5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],
          [6,7],[6,6],[6,5],[6,4],[6,3],[6,2],[6,1],
          [7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],
        ],
      },
    },
  ],
};

// Touch drag support: touchmove doesn't retarget to the element under the
// finger (unlike mouseenter), so we look up the DOM node at the touch point
// and read its data-r/data-c attributes to find the cell being dragged over.
function getCellFromTouch(e) {
  const touch = e.touches && e.touches[0];
  if (!touch) return null;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const cellEl = el && el.closest ? el.closest('[data-r]') : null;
  if (!cellEl) return null;
  const r = Number(cellEl.dataset.r);
  const c = Number(cellEl.dataset.c);
  if (Number.isNaN(r) || Number.isNaN(c)) return null;
  return { r, c };
}

export default function FlowFree() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [paths, setPaths] = useState({});
  const [drawing, setDrawing] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  // Refs prevent stale closures in drag handlers
  const pathsRef = useRef({});
  const drawingRef = useRef(null);
  const puzzleRef = useRef(null);

  const startGame = useCallback((diff, idx = 0) => {
    setDifficulty(diff);
    setPuzzleIdx(idx);
    const p = PUZZLES[diff][idx];
    puzzleRef.current = p;
    pathsRef.current = {};
    drawingRef.current = null;
    setPuzzle(p);
    setPaths({});
    setDrawing(null);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const getDotAt = (r, c) => puzzleRef.current?.dots.find(d => d.r === r && d.c === c);

  const getColorAt = (r, c) => {
    for (const [color, path] of Object.entries(pathsRef.current)) {
      if (path.some(([pr, pc]) => pr === r && pc === c)) return color;
    }
    return null;
  };

  const checkWin = (newPaths) => {
    const pz = puzzleRef.current;
    if (!pz) return false;
    const colorNames = [...new Set(pz.dots.map(d => d.color))];
    const covered = new Map(); // "r,c" -> color, to catch cross-color overlap
    for (const color of colorNames) {
      const path = newPaths[color] || [];
      const colorDots = pz.dots.filter(d => d.color === color);
      if (colorDots.length < 2) continue;
      const [d1, d2] = colorDots;
      if (path.length < 2) return false;
      const s = path[0], e = path[path.length - 1];
      const ok =
        (s[0] === d1.r && s[1] === d1.c && e[0] === d2.r && e[1] === d2.c) ||
        (s[0] === d2.r && s[1] === d2.c && e[0] === d1.r && e[1] === d1.c);
      if (!ok) return false;
      // Path must be contiguous (every step orthogonally adjacent) and free of
      // self-overlap, and must not overlap any other color's path.
      const seenInPath = new Set();
      for (let i = 0; i < path.length; i++) {
        const [r, c] = path[i];
        const key = `${r},${c}`;
        if (seenInPath.has(key)) return false; // self-overlap
        seenInPath.add(key);
        if (i > 0) {
          const [pr, pc] = path[i - 1];
          if (Math.abs(r - pr) + Math.abs(c - pc) !== 1) return false; // non-adjacent step
        }
        if (covered.has(key)) return false; // overlaps a different color's path
        covered.set(key, color);
      }
    }
    return covered.size === pz.size * pz.size;
  };

  const handleCellMouseDown = (r, c) => {
    if (won) return;
    const dot = getDotAt(r, c);
    const existingColor = getColorAt(r, c);
    let color, startPath;
    if (dot) {
      color = dot.color;
      startPath = [[r, c]];
    } else if (existingColor) {
      color = existingColor;
      const path = pathsRef.current[color] || [];
      const idx = path.findIndex(([pr, pc]) => pr === r && pc === c);
      startPath = path.slice(0, idx + 1);
    } else {
      return;
    }
    const newPaths = { ...pathsRef.current, [color]: startPath };
    pathsRef.current = newPaths;
    drawingRef.current = { color, path: startPath };
    setPaths({ ...newPaths });
    setDrawing({ color, path: startPath });
  };

  const handleCellMouseEnter = (r, c) => {
    const drawState = drawingRef.current;
    if (!drawState) return;
    const { color, path } = drawState;
    const last = path[path.length - 1];
    if (last[0] === r && last[1] === c) return;
    if (Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1) return;
    const cellColor = getColorAt(r, c);
    const dot = getDotAt(r, c);
    if (cellColor && cellColor !== color) return;
    if (dot && dot.color !== color) return;
    const inPath = path.findIndex(([pr, pc]) => pr === r && pc === c);
    const newPath = inPath >= 0 ? path.slice(0, inPath + 1) : [...path, [r, c]];
    const newPaths = { ...pathsRef.current, [color]: newPath };
    pathsRef.current = newPaths;
    drawingRef.current = { color, path: newPath };
    setPaths({ ...newPaths });
    setDrawing({ color, path: newPath });
  };

  const handleMouseUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = null;
    setDrawing(null);
    if (checkWin(pathsRef.current)) {
      setWon(true);
      setMsg('All paths connected! Puzzle solved!');
      const score = 500 - (hintUsed ? 100 : 0);
      if (isLoggedIn()) apiRequest('POST', { game_type: 'flow_free', result: 'win', difficulty, score }, '/game/save');
    }
  };

  // Touch equivalents of the mouse drag handlers above. They reuse the exact
  // same state-update functions (handleCellMouseDown / handleCellMouseEnter /
  // handleMouseUp) — only the "which cell is the finger over" detection differs.
  const handleBoardTouchStart = (e) => {
    const cell = getCellFromTouch(e);
    if (!cell) return;
    e.preventDefault();
    handleCellMouseDown(cell.r, cell.c);
  };

  const handleBoardTouchMove = (e) => {
    const cell = getCellFromTouch(e);
    if (!cell) return;
    e.preventDefault();
    handleCellMouseEnter(cell.r, cell.c);
  };

  const handleHint = () => {
    if (hintUsed || !puzzle || won) return;
    setHintUsed(true);
    const colorNames = [...new Set(puzzle.dots.map(d => d.color))];
    for (const color of colorNames) {
      const solPath = puzzle.solutions[color];
      if (!solPath || solPath.length === 0) continue;
      const curPath = pathsRef.current[color] || [];
      let prefixLen = 0;
      for (let i = 0; i < Math.min(curPath.length, solPath.length); i++) {
        if (curPath[i][0] === solPath[i][0] && curPath[i][1] === solPath[i][1]) prefixLen = i + 1;
        else break;
      }
      if (prefixLen < solPath.length) {
        const newPath = solPath.slice(0, prefixLen + 1);
        const newPaths = { ...pathsRef.current, [color]: newPath };
        pathsRef.current = newPaths;
        setPaths({ ...newPaths });
        if (checkWin(newPaths)) {
          setWon(true);
          setMsg('All paths connected! Puzzle solved!');
          const score = 500 - 100;
          if (isLoggedIn()) apiRequest('POST', { game_type: 'flow_free', result: 'win', difficulty, score }, '/game/save');
        } else {
          setMsg(`Hint: extended ${color} path!`);
        }
        return;
      }
    }
    setMsg('Hint: all paths are on track!');
  };

  const cellSize = puzzle ? (puzzle.size === 9 ? 44 : puzzle.size === 7 ? 52 : 64) : 52;

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Flow Free</h1>
          </div>
          <div className="gs-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Connect matching colored dots with paths. Fill every cell. Paths cannot cross!
            </p>
            <div className="difficulty-select">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                  <span className="diff-sub">
                    {d === 'easy' ? '5×5, 4 colors' : d === 'medium' ? '7×7, 4-5 colors' : '9×9, 5-6 colors'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const size = puzzle.size;

  return (
    <div className="game-page" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      onTouchEnd={handleMouseUp} onTouchCancel={handleMouseUp}>
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Flow Free</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <HowToPlay>
          <p>Connect every pair of matching colored dots with an unbroken pipe so that pipes fill the entire board, with no two pipes crossing or overlapping.</p>
          <ul>
            <li>Each color has exactly two dots — draw one continuous path between them.</li>
            <li>A path can only travel between orthogonally adjacent cells (up/down/left/right), never diagonally.</li>
            <li>Two different colors can never share a cell, and every single cell on the board must end up covered by some path.</li>
          </ul>
          <p>Click and drag with the mouse, or press and drag your finger, starting from one of a color's dots and moving across adjacent cells to draw its path; release to finish. Dragging back over your own path shortens it.</p>
        </HowToPlay>
        <div className="game-meta">
          {hintUsed && <span className="hint-used">Hint used</span>}
          <span style={{ color: 'var(--muted)', marginLeft: '1rem', fontSize: '0.85rem' }}>
            Click and drag from a dot to draw its path
          </span>
        </div>
        {msg && <div className={`game-msg ${won ? 'success' : 'info'}`}>{msg}</div>}

        <div style={{ margin: '1rem 0', userSelect: 'none', width: '100%', overflowX: 'auto' }}>
          <div
            onTouchStart={handleBoardTouchStart}
            onTouchMove={handleBoardTouchMove}
            onTouchEnd={handleMouseUp}
            onTouchCancel={handleMouseUp}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              gridTemplateRows: `repeat(${size}, 1fr)`,
              width: `min(100%, ${cellSize * size + (size - 1) + 4}px)`,
              minWidth: `${24 * size + (size - 1) + 4}px`,
              aspectRatio: '1 / 1',
              margin: '0 auto',
              border: '2px solid var(--border)',
              backgroundColor: 'var(--border)',
              gap: 1,
            }}>
            {Array.from({ length: size }, (_, r) =>
              Array.from({ length: size }, (_, c) => {
                const dot = getDotAt(r, c);
                const cellColor = getColorAt(r, c);
                const colorHex = cellColor ? COLORS[cellColor] : null;
                const dotHex = dot ? COLORS[dot.color] : null;
                return (
                  <div key={`${r}-${c}`}
                    data-r={r} data-c={c}
                    onMouseDown={() => handleCellMouseDown(r, c)}
                    onMouseEnter={() => handleCellMouseEnter(r, c)}
                    style={{
                      backgroundColor: colorHex ? `${colorHex}55` : 'var(--surface)',
                      cursor: 'pointer', position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      touchAction: 'none',
                    }}>
                    {cellColor && !dot && (
                      <div style={{
                        width: '45%', height: '45%',
                        borderRadius: '50%', backgroundColor: colorHex, opacity: 0.9,
                      }} />
                    )}
                    {dot && (
                      <div style={{
                        width: '72%', height: '72%',
                        borderRadius: '50%',
                        backgroundColor: dotHex,
                        border: '3px solid rgba(255,255,255,0.55)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>
          )}
          <button className="gs-btn gs-btn-outline gs-btn-sm"
            onClick={() => startGame(difficulty, puzzleIdx)}>Reset</button>
          <button className="gs-btn gs-btn-outline gs-btn-sm"
            onClick={() => startGame(difficulty, (puzzleIdx + 1) % PUZZLES[difficulty].length)}>
            Next Puzzle
          </button>
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty, puzzleIdx)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
