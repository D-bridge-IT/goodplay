// Schach / Шахматы — full rules, own alpha-beta engine in a Web Worker, puzzles (mate in 1/2),
// hand-drawn Staunton-style SVG pieces. Partner p4. Logic (ChessCore) is DOM-free and runs in Node.
(function () {
  'use strict';

  /* =====================================================================================
     ChessCore — self-contained (no outer references) so it can be stringified into a Worker.
     0x88 board, pieces: P1 N2 B3 R4 Q5 K6, black = |8. Move int: from | to<<7 | promo<<14 | flag<<17
     flags: 1 double push, 2 en passant, 3 castling.
     ===================================================================================== */
  function ChessCore() {
    const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
    const MATE = 30000, INF = 32000, MAXPLY = 6400, MAXS = 96;
    const N_OFF = [33, 31, 18, 14, -33, -31, -18, -14], K_OFF = [1, -1, 16, -16, 15, 17, -15, -17];
    const B_OFF = [15, 17, -15, -17], R_OFF = [1, -1, 16, -16];
    const FILES = 'abcdefgh', LET = ['', '', 'N', 'B', 'R', 'Q', 'K'], FEN_CH = ' pnbrqk';
    const VAL = [0, 100, 320, 330, 500, 900, 0];

    // Zobrist keys (two independent 32-bit hashes: index + verification)
    let seed = 0x2545F491;
    const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
    const ZP = new Int32Array(16 * 128), ZP2 = new Int32Array(16 * 128), ZC = new Int32Array(16), ZC2 = new Int32Array(16), ZE = new Int32Array(128), ZE2 = new Int32Array(128);
    for (let i = 0; i < ZP.length; i++) { ZP[i] = rnd(); ZP2[i] = rnd(); }
    for (let i = 0; i < 16; i++) { ZC[i] = rnd(); ZC2[i] = rnd(); }
    for (let i = 0; i < 128; i++) { ZE[i] = rnd(); ZE2[i] = rnd(); }
    const ZS = rnd(), ZS2 = rnd();
    const CM = new Int8Array(128).fill(15);
    CM[4] = 12; CM[0] = 13; CM[7] = 14; CM[116] = 3; CM[112] = 7; CM[119] = 11;

    const sqName = s => FILES[s & 7] + ((s >> 4) + 1);
    const sqFrom = n => (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16;
    const mFrom = m => m & 127, mTo = m => (m >> 7) & 127, mPromo = m => (m >> 14) & 7, mFlag = m => m >> 17;
    const mk = (f, t, p, fl) => f | (t << 7) | (p << 14) | (fl << 17);

    function newPos() {
      return {
        b: new Int8Array(128), side: 0, castle: 0, ep: -1, half: 0, full: 1, king: [4, 116], h: 0, h2: 0, ply: 0,
        uMove: new Int32Array(MAXPLY), uCap: new Int8Array(MAXPLY), uCastle: new Int8Array(MAXPLY), uEp: new Int16Array(MAXPLY),
        uHalf: new Int16Array(MAXPLY), uH: new Int32Array(MAXPLY), uH2: new Int32Array(MAXPLY)
      };
    }

    function computeHash(pos) {
      let h = 0, h2 = 0;
      for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = pos.b[s]; if (p) { h ^= ZP[p * 128 + s]; h2 ^= ZP2[p * 128 + s]; } }
      h ^= ZC[pos.castle]; h2 ^= ZC2[pos.castle];
      if (pos.ep >= 0) { h ^= ZE[pos.ep]; h2 ^= ZE2[pos.ep]; }
      if (pos.side) { h ^= ZS; h2 ^= ZS2; }
      pos.h = h; pos.h2 = h2;
    }

    const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    function fromFen(fen) {
      const pos = newPos(), parts = fen.trim().split(/\s+/);
      let r = 7, f = 0;
      for (const ch of parts[0]) {
        if (ch === '/') { r--; f = 0; continue; }
        if (ch >= '1' && ch <= '8') { f += +ch; continue; }
        const lo = ch.toLowerCase(), t = FEN_CH.indexOf(lo), s = r * 16 + f;
        pos.b[s] = t | (ch === lo ? 8 : 0);
        if (t === K) pos.king[ch === lo ? 1 : 0] = s;
        f++;
      }
      pos.side = parts[1] === 'b' ? 1 : 0;
      const c = parts[2] || '-';
      pos.castle = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
      pos.ep = parts[3] && parts[3] !== '-' ? sqFrom(parts[3]) : -1;
      pos.half = parseInt(parts[4] || '0', 10) || 0;
      pos.full = parseInt(parts[5] || '1', 10) || 1;
      computeHash(pos);
      return pos;
    }

    function toFen(pos) {
      let out = '';
      for (let r = 7; r >= 0; r--) {
        let e = 0;
        for (let f = 0; f < 8; f++) {
          const p = pos.b[r * 16 + f];
          if (!p) { e++; continue; }
          if (e) { out += e; e = 0; }
          const ch = FEN_CH[p & 7]; out += (p & 8) ? ch : ch.toUpperCase();
        }
        if (e) out += e;
        if (r) out += '/';
      }
      const c = (pos.castle & 1 ? 'K' : '') + (pos.castle & 2 ? 'Q' : '') + (pos.castle & 4 ? 'k' : '') + (pos.castle & 8 ? 'q' : '');
      return `${out} ${pos.side ? 'b' : 'w'} ${c || '-'} ${pos.ep >= 0 ? sqName(pos.ep) : '-'} ${pos.half} ${pos.full}`;
    }

    function isAttacked(pos, sq, by) {
      const b = pos.b, col = by ? 8 : 0;
      if (by === 0) {
        if (!((sq - 15) & 0x88) && b[sq - 15] === P) return true;
        if (!((sq - 17) & 0x88) && b[sq - 17] === P) return true;
      } else {
        if (!((sq + 15) & 0x88) && b[sq + 15] === (P | 8)) return true;
        if (!((sq + 17) & 0x88) && b[sq + 17] === (P | 8)) return true;
      }
      const kn = N | col, kg = K | col;
      for (let i = 0; i < 8; i++) {
        let t = sq + N_OFF[i]; if (!(t & 0x88) && b[t] === kn) return true;
        t = sq + K_OFF[i]; if (!(t & 0x88) && b[t] === kg) return true;
      }
      const bb = B | col, rr = R | col, qq = Q | col;
      for (let i = 0; i < 4; i++) {
        let o = B_OFF[i], t = sq + o;
        while (!(t & 0x88)) { const x = b[t]; if (x) { if (x === bb || x === qq) return true; break; } t += o; }
        o = R_OFF[i]; t = sq + o;
        while (!(t & 0x88)) { const x = b[t]; if (x) { if (x === rr || x === qq) return true; break; } t += o; }
      }
      return false;
    }
    const inCheck = pos => isAttacked(pos, pos.king[pos.side], pos.side ^ 1);

    // Pseudo-legal generation into buf[start..]; returns end index.
    function gen(pos, buf, n, capsOnly) {
      const b = pos.b, side = pos.side, me = side ? 8 : 0;
      for (let s = 0; s < 120; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = b[s]; if (!p || (p & 8) !== me) continue;
        const t = p & 7;
        if (t === P) {
          const dir = side ? -16 : 16, rank = s >> 4, promoRank = side ? 1 : 6, startRank = side ? 6 : 1;
          const one = s + dir;
          if (!b[one]) {
            if (rank === promoRank) { buf[n++] = mk(s, one, Q, 0); if (!capsOnly) { buf[n++] = mk(s, one, N, 0); buf[n++] = mk(s, one, R, 0); buf[n++] = mk(s, one, B, 0); } }
            else if (!capsOnly) { buf[n++] = mk(s, one, 0, 0); if (rank === startRank && !b[one + dir]) buf[n++] = mk(s, one + dir, 0, 1); }
          }
          for (let k = -1; k <= 1; k += 2) {
            const c = one + k; if (c & 0x88) continue;
            const x = b[c];
            if (x && (x & 8) !== me) {
              if (rank === promoRank) { buf[n++] = mk(s, c, Q, 0); buf[n++] = mk(s, c, N, 0); buf[n++] = mk(s, c, R, 0); buf[n++] = mk(s, c, B, 0); }
              else buf[n++] = mk(s, c, 0, 0);
            } else if (c === pos.ep && !x) buf[n++] = mk(s, c, 0, 2);
          }
        } else if (t === N || t === K) {
          const offs = t === N ? N_OFF : K_OFF;
          for (let i = 0; i < 8; i++) {
            const d = s + offs[i]; if (d & 0x88) continue;
            const x = b[d];
            if (x) { if ((x & 8) !== me) buf[n++] = mk(s, d, 0, 0); }
            else if (!capsOnly) buf[n++] = mk(s, d, 0, 0);
          }
          if (t === K && !capsOnly) {
            const opp = side ^ 1;
            if (side === 0 && s === 4) {
              if ((pos.castle & 1) && !b[5] && !b[6] && b[7] === R && !isAttacked(pos, 4, opp) && !isAttacked(pos, 5, opp) && !isAttacked(pos, 6, opp)) buf[n++] = mk(4, 6, 0, 3);
              if ((pos.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === R && !isAttacked(pos, 4, opp) && !isAttacked(pos, 3, opp) && !isAttacked(pos, 2, opp)) buf[n++] = mk(4, 2, 0, 3);
            } else if (side === 1 && s === 116) {
              if ((pos.castle & 4) && !b[117] && !b[118] && b[119] === (R | 8) && !isAttacked(pos, 116, opp) && !isAttacked(pos, 117, opp) && !isAttacked(pos, 118, opp)) buf[n++] = mk(116, 118, 0, 3);
              if ((pos.castle & 8) && !b[115] && !b[114] && !b[113] && b[112] === (R | 8) && !isAttacked(pos, 116, opp) && !isAttacked(pos, 115, opp) && !isAttacked(pos, 114, opp)) buf[n++] = mk(116, 114, 0, 3);
            }
          }
        } else {
          const dirs = t === B ? B_OFF : t === R ? R_OFF : K_OFF;
          for (let i = 0; i < dirs.length; i++) {
            const o = dirs[i]; let d = s + o;
            while (!(d & 0x88)) {
              const x = b[d];
              if (x) { if ((x & 8) !== me) buf[n++] = mk(s, d, 0, 0); break; }
              if (!capsOnly) buf[n++] = mk(s, d, 0, 0);
              d += o;
            }
          }
        }
      }
      return n;
    }

    function make(pos, m) {
      const b = pos.b, from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = m >> 17, p = pos.ply, side = pos.side;
      const piece = b[from]; let cap = b[to];
      pos.uMove[p] = m; pos.uCastle[p] = pos.castle; pos.uEp[p] = pos.ep; pos.uHalf[p] = pos.half; pos.uH[p] = pos.h; pos.uH2[p] = pos.h2;
      let h = pos.h, h2 = pos.h2;
      if (pos.ep >= 0) { h ^= ZE[pos.ep]; h2 ^= ZE2[pos.ep]; }
      h ^= ZC[pos.castle]; h2 ^= ZC2[pos.castle];
      h ^= ZP[piece * 128 + from]; h2 ^= ZP2[piece * 128 + from];
      if (flag === 2) {
        const cs = to + (side ? 16 : -16); cap = b[cs]; b[cs] = 0;
        h ^= ZP[cap * 128 + cs]; h2 ^= ZP2[cap * 128 + cs];
      } else if (cap) { h ^= ZP[cap * 128 + to]; h2 ^= ZP2[cap * 128 + to]; }
      pos.uCap[p] = cap;
      const np = promo ? (promo | (piece & 8)) : piece;
      b[to] = np; b[from] = 0;
      h ^= ZP[np * 128 + to]; h2 ^= ZP2[np * 128 + to];
      if (flag === 3) {
        let rf, rt; if (to > from) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
        const rk = b[rf]; b[rt] = rk; b[rf] = 0;
        h ^= ZP[rk * 128 + rf] ^ ZP[rk * 128 + rt]; h2 ^= ZP2[rk * 128 + rf] ^ ZP2[rk * 128 + rt];
      }
      if ((piece & 7) === K) pos.king[side] = to;
      pos.castle &= CM[from] & CM[to];
      h ^= ZC[pos.castle]; h2 ^= ZC2[pos.castle];
      pos.ep = -1;
      if (flag === 1) {
        const ep = (from + to) >> 1, ep2 = P | (side ? 0 : 8);
        if ((!((to + 1) & 0x88) && b[to + 1] === ep2) || (!((to - 1) & 0x88) && b[to - 1] === ep2)) { pos.ep = ep; h ^= ZE[ep]; h2 ^= ZE2[ep]; }
      }
      pos.half = ((piece & 7) === P || cap) ? 0 : pos.half + 1;
      if (side) pos.full++;
      pos.side = side ^ 1; h ^= ZS; h2 ^= ZS2;
      pos.h = h; pos.h2 = h2; pos.ply = p + 1;
    }

    function unmake(pos) {
      const p = --pos.ply, m = pos.uMove[p], b = pos.b;
      pos.side ^= 1; if (pos.side && m !== 0) pos.full--;
      pos.castle = pos.uCastle[p]; pos.ep = pos.uEp[p]; pos.half = pos.uHalf[p]; pos.h = pos.uH[p]; pos.h2 = pos.uH2[p];
      if (m === 0) return; // null move
      const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = m >> 17;
      let piece = b[to]; if (promo) piece = P | (piece & 8);
      b[from] = piece; b[to] = 0;
      const cap = pos.uCap[p];
      if (flag === 2) b[to + (pos.side ? 16 : -16)] = cap; else b[to] = cap;
      if (flag === 3) {
        let rf, rt; if (to > from) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
        b[rf] = b[rt]; b[rt] = 0;
      }
      if ((piece & 7) === K) pos.king[pos.side] = from;
    }

    function makeNull(pos) {
      const p = pos.ply;
      pos.uMove[p] = 0; pos.uCastle[p] = pos.castle; pos.uEp[p] = pos.ep; pos.uHalf[p] = pos.half; pos.uH[p] = pos.h; pos.uH2[p] = pos.h2;
      if (pos.ep >= 0) { pos.h ^= ZE[pos.ep]; pos.h2 ^= ZE2[pos.ep]; pos.ep = -1; }
      pos.side ^= 1; pos.h ^= ZS; pos.h2 ^= ZS2; pos.half = 0; pos.ply = p + 1;
    }

    const tmp = new Int32Array(256);
    function legalMoves(pos) {
      const n = gen(pos, tmp, 0, false), out = [];
      for (let i = 0; i < n; i++) {
        const m = tmp[i]; make(pos, m);
        if (!isAttacked(pos, pos.king[pos.side ^ 1], pos.side)) out.push(m);
        unmake(pos);
      }
      return out;
    }

    function perft(pos, d) {
      if (d === 0) return 1;
      const buf = new Int32Array(256), n = gen(pos, buf, 0, false); let c = 0;
      for (let i = 0; i < n; i++) {
        make(pos, buf[i]);
        if (!isAttacked(pos, pos.king[pos.side ^ 1], pos.side)) c += d === 1 ? 1 : perft(pos, d - 1);
        unmake(pos);
      }
      return c;
    }

    // Repetition count of the current position in game history (same side to move).
    function repCount(pos) {
      let c = 1;
      for (let i = pos.ply - 2, lim = Math.max(0, pos.ply - pos.half); i >= lim; i -= 2) if (pos.uH[i] === pos.h && pos.uH2[i] === pos.h2) c++;
      return c;
    }

    function insufficient(pos) {
      const minors = [];
      for (let s = 0; s < 120; s++) {
        if (s & 0x88) { s += 7; continue; }
        const t = pos.b[s] & 7; if (!t || t === K) continue;
        if (t === P || t === R || t === Q) return false;
        minors.push({ t, c: ((s >> 4) + (s & 7)) & 1 });
      }
      if (minors.length <= 1) return true;
      return minors.every(m => m.t === B && m.c === minors[0].c);
    }

    // Game status: {over, winner(0/1), draw, reason, check}
    function status(pos) {
      const legal = legalMoves(pos), chk = inCheck(pos);
      if (!legal.length) return chk ? { over: true, winner: pos.side ^ 1, reason: 'mate', check: true } : { over: true, draw: true, reason: 'stalemate' };
      if (insufficient(pos)) return { over: true, draw: true, reason: 'material', check: chk };
      if (pos.half >= 100) return { over: true, draw: true, reason: 'fifty', check: chk };
      if (repCount(pos) >= 3) return { over: true, draw: true, reason: 'threefold', check: chk };
      return { over: false, check: chk };
    }

    function san(pos, m, legal) {
      legal = legal || legalMoves(pos);
      const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = m >> 17, t = pos.b[from] & 7;
      let s;
      if (flag === 3) s = to > from ? 'O-O' : 'O-O-O';
      else {
        const cap = pos.b[to] !== 0 || flag === 2;
        if (t === P) { s = (cap ? FILES[from & 7] + 'x' : '') + sqName(to) + (promo ? '=' + LET[promo] : ''); }
        else {
          s = LET[t];
          const others = legal.filter(o => o !== m && ((o >> 7) & 127) === to && (o & 127) !== from && (pos.b[o & 127] & 7) === t);
          if (others.length) {
            const sameFile = others.some(o => ((o & 127) & 7) === (from & 7)), sameRank = others.some(o => ((o & 127) >> 4) === (from >> 4));
            s += !sameFile ? FILES[from & 7] : !sameRank ? String((from >> 4) + 1) : sqName(from);
          }
          s += (cap ? 'x' : '') + sqName(to);
        }
      }
      make(pos, m);
      if (inCheck(pos)) s += legalMoves(pos).length ? '+' : '#';
      unmake(pos);
      return s;
    }

    const uci = m => sqName(m & 127) + sqName((m >> 7) & 127) + (((m >> 14) & 7) ? FEN_CH[(m >> 14) & 7] : '');
    function parseUci(pos, str) {
      const legal = legalMoves(pos), f = sqFrom(str.slice(0, 2)), t = sqFrom(str.slice(2, 4)), pr = str[4] ? FEN_CH.indexOf(str[4]) : 0;
      for (const m of legal) if ((m & 127) === f && ((m >> 7) & 127) === t && ((m >> 14) & 7) === pr) return m;
      return 0;
    }

    /* ---------------- evaluation ---------------- */
    const T = {
      1: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
      3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
      4: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
      5: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
      6: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
      7: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
    };
    const PADV = [0, 0, 8, 16, 30, 55, 95, 0]; // endgame bonus by relative rank
    const PST = new Int16Array(16 * 128), KEG = new Int16Array(2 * 128), PEG = new Int16Array(2 * 128);
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      const f = s & 7, r = s >> 4, wi = (7 - r) * 8 + f, bi = r * 8 + f;
      for (let t = 1; t <= 6; t++) { PST[t * 128 + s] = VAL[t] + T[t][wi]; PST[(t | 8) * 128 + s] = VAL[t] + T[t][bi]; }
      KEG[s] = T[7][wi]; KEG[128 + s] = T[7][bi];
      PEG[s] = PADV[r]; PEG[128 + s] = PADV[7 - r];
    }
    const PH = [0, 0, 1, 1, 2, 4, 0];
    const pf = [new Int8Array(8), new Int8Array(8)];

    function evaluate(pos) {
      const b = pos.b;
      let mg0 = 0, mg1 = 0, eg0 = 0, eg1 = 0, phase = 0, bis0 = 0, bis1 = 0, pawns0 = 0, pawns1 = 0, heavy0 = 0, heavy1 = 0, minor0 = 0, minor1 = 0;
      const f0 = pf[0], f1 = pf[1]; f0.fill(0); f1.fill(0);
      for (let s = 0; s < 120; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = b[s]; if (!p) continue;
        const t = p & 7, black = p & 8;
        phase += PH[t];
        if (black) {
          if (t === K) { eg1 += KEG[128 + s]; mg1 += PST[p * 128 + s]; continue; }
          mg1 += PST[p * 128 + s];
          if (t === P) { f1[s & 7]++; pawns1++; eg1 += PEG[128 + s]; } else if (t === B) { bis1++; minor1++; } else if (t === N) minor1++; else heavy1++;
        } else {
          if (t === K) { eg0 += KEG[s]; mg0 += PST[p * 128 + s]; continue; }
          mg0 += PST[p * 128 + s];
          if (t === P) { f0[s & 7]++; pawns0++; eg0 += PEG[s]; } else if (t === B) { bis0++; minor0++; } else if (t === N) minor0++; else heavy0++;
        }
      }
      // pawn structure
      let st = 0;
      for (let f = 0; f < 8; f++) {
        const a = f0[f], c = f1[f];
        if (a > 1) st -= 12 * (a - 1);
        if (c > 1) st += 12 * (c - 1);
        if (a && !(f > 0 && f0[f - 1]) && !(f < 7 && f0[f + 1])) st -= 10 * a;
        if (c && !(f > 0 && f1[f - 1]) && !(f < 7 && f1[f + 1])) st += 10 * c;
      }
      // rooks on open / half-open files
      for (let s = 0; s < 120; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = b[s]; if ((p & 7) !== R) continue;
        const f = s & 7;
        if (p & 8) { if (!f1[f]) st -= f0[f] ? 8 : 16; }
        else if (!f0[f]) st += f1[f] ? 8 : 16;
      }
      if (bis0 >= 2) st += 30;
      if (bis1 >= 2) st -= 30;
      if (phase > 24) phase = 24;
      // king: blend midgame PST (inside mg) with the endgame table; eg also holds pawn advancement
      const kmg0 = PST[(K) * 128 + pos.king[0]], kmg1 = PST[(K | 8) * 128 + pos.king[1]];
      const base0 = mg0 - kmg0, base1 = mg1 - kmg1;
      let score = (base0 - base1) + st
        + Math.round(((kmg0 - kmg1) * phase + (eg0 - eg1) * (24 - phase)) / 24);
      if (!pawns0 && !pawns1 && !heavy0 && !heavy1 && minor0 <= 1 && minor1 <= 1) return 0;
      // mop-up: drive the lone king to the edge
      if ((!pawns0 && !pawns1) || phase <= 6) {
        const lead = score;
        if (Math.abs(lead) >= 300) {
          const strong = lead > 0 ? 0 : 1, wk = pos.king[strong], lk = pos.king[strong ^ 1];
          const lf = lk & 7, lr = lk >> 4, cd = Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4);
          const dist = Math.abs((wk & 7) - lf) + Math.abs((wk >> 4) - lr);
          const mop = cd * 10 + (14 - dist) * 4;
          score += strong === 0 ? mop : -mop;
        }
      }
      if (!pawns0 && score > 0 && heavy0 === 0 && minor0 <= 1) score = score >> 3;
      if (!pawns1 && score < 0 && heavy1 === 0 && minor1 <= 1) score = score >> 3;
      return pos.side ? -score : score;
    }

    /* ---------------- search ---------------- */
    const TTSIZE = 1 << 19, TTMASK = TTSIZE - 1;
    let ttKey = null, ttMove, ttScore, ttDepth, ttFlag;
    function ttInit() { if (ttKey) return; ttKey = new Int32Array(TTSIZE); ttMove = new Int32Array(TTSIZE); ttScore = new Int16Array(TTSIZE); ttDepth = new Int8Array(TTSIZE); ttFlag = new Uint8Array(TTSIZE); }
    const MB = new Int32Array(MAXS * 256), MS = new Int32Array(MAXS * 256);
    const killers = new Int32Array(MAXS * 2), hist = new Int32Array(16 * 128);
    let nodes = 0, stopTime = 0, stopped = false, rootBest = 0, rootScore = 0, rootRandom = 0;

    function isRep(pos) {
      for (let i = pos.ply - 2, lim = Math.max(0, pos.ply - pos.half); i >= lim; i -= 2) if (pos.uH[i] === pos.h && pos.uH2[i] === pos.h2) return true;
      return false;
    }
    function hasPieces(pos, side) {
      const me = side ? 8 : 0;
      for (let s = 0; s < 120; s++) { if (s & 0x88) { s += 7; continue; } const p = pos.b[s]; if (p && (p & 8) === me) { const t = p & 7; if (t !== P && t !== K) return true; } }
      return false;
    }

    function scoreMoves(pos, start, end, ttm, ply) {
      const b = pos.b, k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
      for (let i = start; i < end; i++) {
        const m = MB[i], to = (m >> 7) & 127, from = m & 127, pr = (m >> 14) & 7;
        let sc;
        if (m === ttm) sc = 2000000;
        else if (b[to] || (m >> 17) === 2) sc = 1000000 + (b[to] ? (b[to] & 7) : 1) * 100 - (b[from] & 7);
        else if (pr === Q) sc = 950000;
        else if (m === k1) sc = 900000;
        else if (m === k2) sc = 890000;
        else { sc = hist[b[from] * 128 + to]; if (rootRandom && ply === 0) sc += (Math.random() * rootRandom) | 0; }
        if (pr && pr !== Q) sc -= 500000;
        MS[i] = sc;
      }
    }
    function pick(i, end) {
      let bi = i, bs = MS[i];
      for (let j = i + 1; j < end; j++) if (MS[j] > bs) { bs = MS[j]; bi = j; }
      if (bi !== i) { const m = MB[i], s = MS[i]; MB[i] = MB[bi]; MS[i] = MS[bi]; MB[bi] = m; MS[bi] = s; }
      return MB[i];
    }

    function qsearch(pos, alpha, beta, ply) {
      if ((++nodes & 1023) === 0 && Date.now() > stopTime) stopped = true;
      if (stopped) return 0;
      const stand = evaluate(pos);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (ply >= MAXS - 1) return stand;
      const start = ply * 256, end = gen(pos, MB, start, true), b = pos.b;
      for (let i = start; i < end; i++) { const m = MB[i], to = (m >> 7) & 127; MS[i] = (b[to] ? (b[to] & 7) * 100 : ((m >> 14) & 7) ? 800 : 100) - (b[m & 127] & 7); }
      for (let i = start; i < end; i++) {
        const m = pick(i, end), to = (m >> 7) & 127, victim = b[to] & 7, pr = (m >> 14) & 7;
        if (!pr && stand + VAL[victim || 1] + 200 < alpha) continue;
        make(pos, m);
        if (isAttacked(pos, pos.king[pos.side ^ 1], pos.side)) { unmake(pos); continue; }
        const s = -qsearch(pos, -beta, -alpha, ply + 1);
        unmake(pos);
        if (stopped) return 0;
        if (s > alpha) { if (s >= beta) return s; alpha = s; }
      }
      return alpha;
    }

    function search(pos, depth, alpha, beta, ply, nullOk) {
      if ((++nodes & 1023) === 0 && Date.now() > stopTime) stopped = true;
      if (stopped) return 0;
      if (ply > 0) {
        if (pos.half >= 100 || isRep(pos)) return 0;
        if (alpha < -MATE + ply) alpha = -MATE + ply;
        if (beta > MATE - ply - 1) beta = MATE - ply - 1;
        if (alpha >= beta) return alpha;
      }
      const chk = isAttacked(pos, pos.king[pos.side], pos.side ^ 1);
      if (chk) depth++;
      if (depth <= 0) return qsearch(pos, alpha, beta, ply);
      if (ply >= MAXS - 2) return evaluate(pos);
      const idx = pos.h & TTMASK; let ttm = 0;
      if (ttKey[idx] === pos.h2) {
        ttm = ttMove[idx];
        if (ply > 0 && ttDepth[idx] >= depth) {
          let s = ttScore[idx]; if (s > MATE - 500) s -= ply; else if (s < -MATE + 500) s += ply;
          const fl = ttFlag[idx];
          if (fl === 1 || (fl === 2 && s >= beta) || (fl === 3 && s <= alpha)) return s;
        }
      }
      const pv = beta - alpha > 1;
      if (nullOk && !chk && !pv && depth >= 3 && beta < MATE - 500 && hasPieces(pos, pos.side) && evaluate(pos) >= beta) {
        makeNull(pos);
        const s = -search(pos, depth - 1 - (depth > 6 ? 3 : 2), -beta, -beta + 1, ply + 1, false);
        unmake(pos);
        if (stopped) return 0;
        if (s >= beta) return beta;
      }
      const start = ply * 256, end = gen(pos, MB, start, false);
      scoreMoves(pos, start, end, ttm, ply);
      let best = -INF, bestMove = 0, legal = 0;
      const oldAlpha = alpha;
      for (let i = start; i < end; i++) {
        const m = pick(i, end);
        make(pos, m);
        if (isAttacked(pos, pos.king[pos.side ^ 1], pos.side)) { unmake(pos); continue; }
        legal++;
        const isCap = pos.uCap[pos.ply - 1] !== 0, pr = (m >> 14) & 7;
        let s;
        if (legal === 1) s = -search(pos, depth - 1, -beta, -alpha, ply + 1, true);
        else {
          let r = 0;
          if (depth >= 3 && legal > 3 && !chk && !isCap && !pr && m !== killers[ply * 2] && m !== killers[ply * 2 + 1] && !isAttacked(pos, pos.king[pos.side], pos.side ^ 1))
            r = legal > 10 && depth >= 5 ? 2 : 1;
          s = -search(pos, depth - 1 - r, -alpha - 1, -alpha, ply + 1, true);
          if (s > alpha && r) s = -search(pos, depth - 1, -alpha - 1, -alpha, ply + 1, true);
          if (s > alpha && s < beta) s = -search(pos, depth - 1, -beta, -alpha, ply + 1, true);
        }
        unmake(pos);
        if (stopped) return 0;
        if (s > best) {
          best = s; bestMove = m;
          if (ply === 0) { rootBest = m; rootScore = s; }
          if (s > alpha) {
            alpha = s;
            if (s >= beta) {
              if (!isCap && !pr) {
                if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
                const hi = pos.b[m & 127] * 128 + ((m >> 7) & 127); hist[hi] += depth * depth; if (hist[hi] > 800000) for (let j = 0; j < hist.length; j++) hist[j] >>= 1;
              }
              break;
            }
          }
        }
      }
      if (!legal) return chk ? -MATE + ply : 0;
      let ss = best; if (ss > MATE - 500) ss += ply; else if (ss < -MATE + 500) ss -= ply;
      ttKey[idx] = pos.h2; ttMove[idx] = bestMove; ttScore[idx] = ss; ttDepth[idx] = depth;
      ttFlag[idx] = best >= beta ? 2 : best > oldAlpha ? 1 : 3;
      return best;
    }

    // Iterative deepening. Returns {move, score, depth, nodes}
    function bestMove(pos, maxDepth, timeMs, randomize) {
      ttInit();
      const t0 = Date.now(); stopTime = t0 + timeMs; stopped = false; nodes = 0;
      killers.fill(0); for (let j = 0; j < hist.length; j++) hist[j] >>= 2;
      rootRandom = randomize ? 40 : 0;
      let best = 0, score = 0, depth = 0;
      for (let d = 1; d <= maxDepth; d++) {
        rootBest = 0;
        const s = search(pos, d, -INF, INF, 0, false);
        if (rootBest) { best = rootBest; score = stopped ? Math.max(score, rootScore) : s; }
        if (stopped) break;
        depth = d; rootRandom = 0;
        if (Math.abs(s) > MATE - 200 && d >= 3) break;
        if (Date.now() - t0 > timeMs * 0.5) break;
      }
      if (!best) { const l = legalMoves(pos); best = l[0] || 0; }
      return { move: best, score, depth, nodes };
    }

    function easyPick(pos, legal) {
      stopTime = Date.now() + 700; stopped = false;
      const sc = legal.map(m => {
        make(pos, m);
        let s;
        if (!legalMoves(pos).length) s = inCheck(pos) ? MATE : 0;
        else s = -qsearch(pos, -INF, INF, 1);
        unmake(pos);
        return { m, s };
      }).sort((a, b) => b.s - a.s);
      const best = sc[0].s, r = Math.random();
      if (best >= MATE && r < 0.75) return sc[0];
      const ok = sc.filter(x => x.s >= best - 120 && x.s < MATE).slice(0, 6);
      if (r < 0.6 && ok.length) return ok[(Math.random() * ok.length) | 0];
      const meh = sc.filter(x => x.s >= best - 320 && x.s < MATE);
      if (r < 0.78 && meh.length) return meh[(Math.random() * meh.length) | 0];
      return sc[0];
    }

    // Worker entry: {fen, moves:[uci], level:'easy'|'medium'|'hard'|'hint', time}
    function think(o) {
      const pos = fromFen(o.fen || START);
      for (const u of o.moves || []) { const m = parseUci(pos, u); if (!m) break; make(pos, m); }
      const legal = legalMoves(pos);
      if (!legal.length) return { move: null };
      const t0 = Date.now();
      let r;
      if (o.level === 'easy') { const p = easyPick(pos, legal); r = { move: p.m, score: p.s, depth: 1 }; }
      else if (o.level === 'medium') r = bestMove(pos, 3, Math.min(o.time || 1000, 1000), pos.full <= 6);
      else r = bestMove(pos, 64, o.time || 1000, o.level === 'hard' && pos.full <= 4);
      return { move: uci(r.move), san: san(pos, r.move, legal), score: r.score, depth: r.depth, nodes: r.nodes || 0, ms: Date.now() - t0 };
    }

    // Exact mate solver: can the side to move force mate within n moves?
    function forcedMate(pos, n) {
      for (const m of legalMoves(pos)) if (mateAfter(pos, m, n)) return true;
      return false;
    }
    function mateAfter(pos, m, n) {
      make(pos, m);
      const replies = legalMoves(pos); let ok;
      if (!replies.length) ok = inCheck(pos);
      else if (n <= 1) ok = false;
      else { ok = true; for (const r of replies) { make(pos, r); const sub = forcedMate(pos, n - 1); unmake(pos); if (!sub) { ok = false; break; } } }
      unmake(pos);
      return ok;
    }
    function mateKeys(pos, n) { return legalMoves(pos).filter(m => mateAfter(pos, m, n)); }

    return {
      START, fromFen, toFen, legalMoves, make, unmake, inCheck, isAttacked, perft, status, san, uci, parseUci, evaluate,
      think, bestMove, forcedMate, mateAfter, mateKeys, repCount, insufficient, sqName, sqFrom,
      mFrom, mTo, mPromo, mFlag, P, N, B, R, Q, K
    };
  }

  /* =====================================================================================
     Puzzles — verified in Node with ChessCore.mateKeys (see report). n = mate in n.
     sol: key move(s) in UCI; for mate in 2 the defender's main reply and the mate follow.
     ===================================================================================== */
  const RAW_PUZZLES = [
    // ---- mate in 1 (easy → harder)
    ['k7/8/1K6/8/8/8/8/6Q1 w - - 0 1', 1, 'g1g8'],                                  // Qg8#
    ['6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 1, 'd1d8'],                           // Rd8# back rank
    ['3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', 1, 'd8d1'],                           // ...Rd1#
    ['7k/8/5N2/8/8/8/8/6RK w - - 0 1', 1, 'g1g8'],                                  // Rg8#
    ['7k/R7/5N2/8/8/8/8/6K1 w - - 0 1', 1, 'a7h7'],                                 // Rh7# Arabian mate
    ['6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', 1, 'g5f7'],                               // Nf7# smothered mate
    ['r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 1, 'h5f7'], // Qxf7# Scholar's mate
    ['rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', 1, 'd8h4'],   // ...Qh4# Fool's mate
    ['8/8/8/8/8/5n2/r7/7K b - - 0 1', 1, 'a2h2'],                                   // ...Rh2#
    ['6k1/5p1p/5PpQ/8/8/8/8/6K1 w - - 0 1', 1, 'h6g7'],                             // Qg7#
    ['4k3/5p2/8/6B1/8/8/8/3R2K1 w - - 0 1', 1, 'd1d8'],                             // Rd8# Opera mate
    ['3r2k1/8/8/8/6b1/8/5P2/4K3 b - - 0 1', 1, 'd8d1'],                             // ...Rd1#
    ['8/4Nppk/8/8/8/8/2K5/R7 w - - 0 1', 1, 'a1h1'],                                // Rh1# Anastasia's mate
    ['3rkr2/8/8/8/8/8/Q7/6K1 w - - 0 1', 1, 'a2e6'],                                // Qe6# epaulette mate
    ['2kr4/p2n4/8/8/5B2/8/4B3/6K1 w - - 0 1', 1, 'e2a6'],                           // Ba6# Boden's mate
    // ---- mate in 2 (easy → harder)
    ['6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1', 2, 'a2a7 g8f8 b1b8'],                      // Ra7 Kf8 Rb8# (Rb7 works too)
    ['8/8/k7/8/1r6/r7/8/7K b - - 0 1', 2, 'b4b2 h1g1 a3a1'],                        // ...Rb2 Kg1 Ra1# (Ra2 works too)
    ['r5k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', 2, 'd2d8 a8d8 d1d8'],              // Rd8+ Rxd8 Rxd8#
    ['3r2k1/3r1ppp/8/8/8/8/5PPP/R5K1 b - - 0 1', 2, 'd7d1 a1d1 d8d1'],              // ...Rd1+ Rxd1 Rxd1#
    ['5r1k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1', 2, 'd5g8 f8g8 h6f7'],                   // Qg8+ Rxg8 Nf7#
    ['6k1/8/8/8/3q4/7n/6PP/5R1K b - - 0 1', 2, 'd4g1 f1g1 h3f2'],                   // ...Qg1+ Rxg1 Nf2#
    ['1r2r3/pp3k2/1n2p2p/2qp2p1/8/P2QP2P/PBP2PP1/1R4K1 w - - 0 1', 2, 'd3h7 f7f8 h7g7'], // Qh7+ Kf8 Qg7#
    ['r2qkbnr/ppp2ppp/2np4/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6', 2, 'c4f7 e8e7 c3d5'], // Bxf7+ Ke7 Nd5# Légal's mate
    ['4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 17', 2, 'b3b8 d7b8 d1d8'], // Qb8+ Nxb8 Rd8# Morphy, Opera game
    ['5r1k/pp2Nppp/8/7Q/8/3R4/5PPP/6K1 w - - 0 1', 2, 'h5h7 h8h7 d3h3'],            // Qxh7+ Kxh7 Rh3#
    ['1k1r1b1r/ppp3p1/4p2p/2P1R3/1P6/8/1P3PPP/1RB3K1 b - - 0 1', 2, 'd8d1 e5e1 d1e1'], // ...Rd1+ Re1 Rxe1#
    ['rk1r4/7p/1p1qNpb1/2p3p1/2B1n3/P3P2Q/1P3PPP/2R1K2R b - - 0 1', 2, 'd6d2 e1f1 d2f2'], // ...Qd2+ Kf1 Qxf2#
    ['r1bq1bnN/ppppk2p/2n2p2/4p2Q/8/2N1P3/PPPP1PPP/R1B1KB1R w KQ - 0 1', 2, 'h5f7 e7d6 c3e4'], // Qf7+ Kd6 Ne4#
    ['2r1kbQ1/p1pnppp1/2B4p/2N3B1/8/8/PqP2P1P/R5K1 w - - 0 1', 2, 'c6d7 e8d8 g8f8'], // Bxd7+ Kd8 Qxf8#
    ['3k1b1r/2p2ppp/4p3/1Q1pP3/3P2P1/1p6/1r2NP1P/2R3K1 w - - 0 1', 2, 'b5b8 d8d7 c1c7'], // Qb8+ Kd7 Rxc7#
    ['2kr1b1r/2p1pp2/2Bqb2p/p5p1/3P4/P2Q1N2/2PBNnPP/R3K2R w KQ - 0 1', 2, 'd3a6 c8b8 a6a8'], // Qa6+ Kb8 Qa8#
    ['3r1k1r/1p1P1pp1/6b1/p3R3/q1B2Q1p/5P2/1PP3P1/1K2R3 w - - 0 1', 2, 'e5e8 d8e8 e1e8'], // Re8+ Rxe8 Rxe8#
    ['6k1/4rppp/1p6/3p4/8/PP1q4/5b2/2K2R1R b - - 0 1', 2, 'e7e2 f1d1 d3c2'],        // ...Re2! (quiet) Rd1 Qc2#
    ['6k1/8/p5p1/1pp1b2p/3pPr1P/PR1P3K/2P5/8 b - - 0 1', 2, 'f4f2 c2c3 f2h2']       // ...Rf2! (quiet) c3 Rh2#
  ];
  const PUZZLES = RAW_PUZZLES.map((p, i) => ({ id: 'p' + (i + 1), fen: p[0], n: p[1], sol: p[2].split(' '), side: p[0].split(' ')[1] === 'b' ? 1 : 0 }));

  /* =====================================================================================
     SVG piece set — original Staunton-style drawing on a 100×100 grid.
     ===================================================================================== */
  const BASE = '<path d="M22 81H78Q82 81 82 85V87Q82 90 79 90H21Q18 90 18 87V85Q18 81 22 81Z"/><path d="M27 81Q27 74 34 73H66Q73 74 73 81Z"/>';
  const SHAPES = {
    p: { body: '<path d="M39 47C39 58 34 66 29 73H71C66 66 61 58 61 47Z"/><path d="M33 50Q33 43 40 42H60Q67 43 67 50Z"/><circle cx="50" cy="29" r="13"/>', det: '' },
    r: { body: '<path d="M35 38H65L64 63C66 67 69 70 71 73H29C31 70 34 67 36 63Z"/><path d="M27 16H37V23H45V16H55V23H63V16H73V31Q73 35 68 37L65 38H35L32 37Q27 35 27 31Z"/>', det: '<path d="M29 31H71M36 63H64M35 43H65"/>' },
    b: { body: '<path d="M41 54C41 62 35 68 30 73H70C65 68 59 62 59 54Z"/><path d="M33 56Q33 48 40 48H60Q67 48 67 56Z"/><path d="M50 15C60 22 67 32 65 41C64 45 61 48 58 48H42C39 48 36 45 35 41C33 32 40 22 50 15Z"/><circle cx="50" cy="11" r="5"/>', det: '<path d="M56 25L46 37M43 52H57"/>' },
    n: { body: '<path d="M30 73C31 62 37 56 44 50C38 51 32 54 28 55C23 56 19 52 20 47C21 43 26 39 31 34C35 29 39 25 42 20L46 10L52 18C65 19 76 30 76 47C76 58 74 66 71 73Z"/>', det: '<path d="M53 20C63 25 69 35 70 49M44 50C47 47 47 43 45 41M24 48Q26 46.5 28 48.5"/>', eye: '<ellipse cx="38.5" cy="31" rx="2.6" ry="2.2"/>' },
    q: { body: '<path d="M32 70C32 62 29 52 24 32L34 48L37 25L44 44L50 21L56 44L63 25L66 48L76 32C71 52 68 62 68 70Z"/><path d="M29 74Q29 67 35 66H65Q71 67 71 74Z"/><circle cx="24" cy="30" r="4.6"/><circle cx="37" cy="23" r="4.6"/><circle cx="50" cy="19" r="5"/><circle cx="63" cy="23" r="4.6"/><circle cx="76" cy="30" r="4.6"/>', det: '<path d="M33 59Q50 54 67 59"/>' },
    k: { body: '<path d="M47 7H53V13H59V19H53V34H47V19H41V13H47Z"/><path d="M33 70C34 62 36 56 37 50H63C64 56 66 62 67 70Z"/><path d="M37 50C27 46 26 32 37 30C42 29 47 32 50 37C53 32 58 29 63 30C74 32 73 46 63 50Z"/><path d="M34 54Q34 48 40 48H60Q66 48 66 54Z"/><path d="M29 74Q29 67 35 66H65Q71 67 71 74Z"/>', det: '<path d="M50 38V47M36 60Q50 56 64 60"/>' }
  };
  function pieceInner(t, white, gid) {
    const sh = SHAPES[t];
    const fill = white ? `url(#${gid}w)` : `url(#${gid}b)`, stroke = white ? '#2a241d' : '#0b0908', det = white ? '#2a241d' : '#cfc6b8';
    return `<g fill="${fill}" stroke="${stroke}" stroke-width="3.3" stroke-linejoin="round" stroke-linecap="round">${BASE}${sh.body}</g>` +
      (sh.det ? `<g fill="none" stroke="${det}" stroke-width="2.4" stroke-linecap="round" opacity="${white ? .85 : .7}">${sh.det}</g>` : '') +
      (sh.eye ? `<g fill="${white ? '#2a241d' : '#e8e0d2'}">${sh.eye}</g>` : '') +
      (white ? '' : `<g fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"><path d="M31 87H69"/></g>`);
  }
  function gradDefs(gid) {
    return `<linearGradient id="${gid}w" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f4eee2"/><stop offset="1" stop-color="#d8ccb6"/></linearGradient>` +
      `<linearGradient id="${gid}b" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#5a544e"/><stop offset=".45" stop-color="#2b2724"/><stop offset="1" stop-color="#0f0d0c"/></linearGradient>`;
  }
  // Global symbol sheet injected once per mount.
  function symbolSheet() {
    let s = `<svg xmlns="http://www.w3.org/2000/svg" class="ch-defs" aria-hidden="true" focusable="false"><defs>${gradDefs('chs-g')}</defs>`;
    for (const t of 'pnbrqk') for (const w of [1, 0]) s += `<symbol id="chs-${w ? 'w' : 'b'}${t}" viewBox="0 0 100 100">${pieceInner(t, !!w, 'chs-g')}</symbol>`;
    return s + '</svg>';
  }
  const useSvg = (code, cls) => `<svg class="${cls || ''}" viewBox="0 0 100 100"><use href="#chs-${code}"/></svg>`;
  const CODE = p => (p & 8 ? 'b' : 'w') + ' pnbrqk'[p & 7];

  /* ---------------- art ---------------- */
  function thumbArt() {
    const sq = [];
    for (let r = 0; r < 4; r++) for (let f = 0; f < 6; f++) sq.push(`<rect x="${70 + f * 15}" y="${20 + r * 15}" width="15" height="15" fill="${(r + f) % 2 ? '#b98761' : '#ecd5b0'}"/>`);
    return `<defs><linearGradient id="chT-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c1d14"/><stop offset="1" stop-color="#6b4429"/></linearGradient>${gradDefs('chT-g')}
      <radialGradient id="chT-glow" cx=".3" cy=".4" r=".6"><stop offset="0" stop-color="#ffd58a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient></defs>
      <rect width="160" height="80" fill="url(#chT-bg)"/><rect width="160" height="80" fill="url(#chT-glow)"/>
      <g transform="skewX(-12) translate(10 0)" opacity=".95">${sq.join('')}</g>
      <ellipse cx="52" cy="73" rx="19" ry="3.5" fill="#000" opacity=".35"/><ellipse cx="96" cy="70" rx="15" ry="3" fill="#000" opacity=".35"/>
      <g transform="translate(26 8) scale(.66)">${pieceInner('k', true, 'chT-g')}</g>
      <g transform="translate(74 18) scale(.54)">${pieceInner('n', false, 'chT-g')}</g>`;
  }
  function bigArt() {
    let sq = '';
    // perspective board: rows shrink towards the horizon
    const rows = 6, top = 92, bot = 170, cx = 160;
    for (let r = 0; r < rows; r++) {
      const y0 = top + (bot - top) * Math.pow(r / rows, 1.35), y1 = top + (bot - top) * Math.pow((r + 1) / rows, 1.35);
      const w0 = 150 + r * 52, w1 = 150 + (r + 1) * 52;
      for (let f = 0; f < 8; f++) {
        const xa0 = cx - w0 + (2 * w0) * f / 8, xb0 = cx - w0 + (2 * w0) * (f + 1) / 8, xa1 = cx - w1 + (2 * w1) * f / 8, xb1 = cx - w1 + (2 * w1) * (f + 1) / 8;
        sq += `<path d="M${xa0.toFixed(1)} ${y0.toFixed(1)}L${xb0.toFixed(1)} ${y0.toFixed(1)}L${xb1.toFixed(1)} ${y1.toFixed(1)}L${xa1.toFixed(1)} ${y1.toFixed(1)}Z" fill="${(r + f) % 2 ? '#a8774f' : '#e9cfa6'}"/>`;
      }
    }
    return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block">
      <defs>
        <linearGradient id="chA-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b120d"/><stop offset=".6" stop-color="#3a2618"/><stop offset="1" stop-color="#140d09"/></linearGradient>
        <radialGradient id="chA-spot" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#ffcf7d" stop-opacity=".55"/><stop offset=".55" stop-color="#e09a45" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        <linearGradient id="chA-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b120d" stop-opacity=".95"/><stop offset=".45" stop-color="#1b120d" stop-opacity="0"/></linearGradient>
        <radialGradient id="chA-vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
        ${gradDefs('chA-g')}
        <filter id="chA-sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <rect width="320" height="170" fill="url(#chA-bg)"/>
      <g opacity=".95">${sq}</g>
      <rect y="88" width="320" height="82" fill="url(#chA-fade)"/>
      <rect width="320" height="170" fill="url(#chA-spot)"/>
      <g fill="#fff" opacity=".5"><circle cx="40" cy="26" r=".9"/><circle cx="276" cy="18" r="1.1"/><circle cx="252" cy="44" r=".7"/><circle cx="70" cy="52" r=".7"/><circle cx="300" cy="62" r=".8"/></g>
      <ellipse cx="128" cy="152" rx="40" ry="8" fill="#000" opacity=".5" filter="url(#chA-sh)"/>
      <ellipse cx="200" cy="150" rx="34" ry="7" fill="#000" opacity=".5" filter="url(#chA-sh)"/>
      <ellipse cx="252" cy="140" rx="18" ry="4" fill="#000" opacity=".45" filter="url(#chA-sh)"/>
      <ellipse cx="76" cy="140" rx="18" ry="4" fill="#000" opacity=".45" filter="url(#chA-sh)"/>
      <g transform="translate(58 104) scale(.38)" opacity=".9">${pieceInner('p', false, 'chA-g')}</g>
      <g transform="translate(234 104) scale(.38)" opacity=".9">${pieceInner('p', true, 'chA-g')}</g>
      <g transform="translate(160 66) scale(.88)">${pieceInner('n', false, 'chA-g')}</g>
      <g transform="translate(78 30) scale(1.24)">${pieceInner('k', true, 'chA-g')}</g>
      <rect width="320" height="170" fill="url(#chA-vig)"/>
    </svg>`;
  }

  /* ---------------- small UI icons ---------------- */
  const IC = {
    neu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    undo: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/></svg>',
    hint: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.6 10.8c.6.5 1 1.2 1.1 2.2h5c.1-1 .5-1.7 1.1-2.2A6 6 0 0012 3z"/></svg>',
    flip: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v14l-3-3M17 20V6l3 3"/></svg>',
    rules: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5M9 8h6"/></svg>',
    reset: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    flag: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>'
  };

  const FIG = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
  const figSan = s => s.replace(/^[KQRBN]/, c => FIG[c] + '︎').replace(/=([QRBN])/, (_, c) => '=' + FIG[c] + '︎');

  /* =====================================================================================
     Game
     ===================================================================================== */
  Games.register({
    id: 'chess', icon: '♟️', partner: 'p4', tier: 'top', isNew: true,
    name: { de: 'Schach', en: 'Chess', ru: 'Шахматы', uk: 'Шахи' },
    tagline: { de: 'Klassisches Schach gegen den Computer – plus Mattaufgaben.', en: 'Classic chess against the computer – plus mate puzzles.', ru: 'Классические шахматы против компьютера и задачи на мат.', uk: 'Класичні шахи проти комп’ютера та задачі на мат.' },
    kicker: { de: 'Der Klassiker', en: 'The classic', ru: 'Вечная классика', uk: 'Вічна класика' },
    badges: [
      { id: 'chess_win', icon: '🏆', name: { de: 'Sieg gegen Mittel+', en: 'Win vs. Medium+', ru: 'Победа над «Средним»', uk: 'Перемога над «Середнім»' } },
      { id: 'chess_puzzles', icon: '🧩', name: { de: '10 Aufgaben gelöst', en: '10 puzzles solved', ru: '10 задач решено', uk: '10 задач розв’язано' } }
    ],
    thumb: thumbArt,
    art: bigArt,
    _core: ChessCore,
    _puzzles: PUZZLES,
    mount
  });

  function mount(root, ctx) {
    const C = ChessCore();
    const s = Kit.strings({
      de: {
        modeGame: 'Partie', modePuzzle: 'Aufgaben', you: 'Du', cpu: 'Computer', thinking: 'denkt nach', yourTurn: 'Du bist am Zug', check: 'Schach!',
        newTitle: 'Neue Partie', strength: 'Spielstärke', colorQ: 'Deine Farbe', white: 'Weiß', black: 'Schwarz', random: 'Zufall', start: 'Partie starten',
        flip: 'Drehen', newG: 'Neu', mate: 'Schachmatt', stalemate: 'Patt', threefold: 'Dreifache Stellungswiederholung', fifty: '50-Züge-Regel', material: 'Ungenügendes Material', resign: 'Aufgeben', resignQ: 'Partie wirklich aufgeben?', resigned: 'Du hast aufgegeben', notStarted: 'Die Partie hat noch nicht begonnen',
        winLine: 'Stark gespielt – du hast den Computer ({lvl}) besiegt!', loseTitle: 'Diesmal nicht', loseLine: 'Gut gekämpft! Jede Partie macht dich stärker – gleich noch eine?',
        drawLine: 'Ein ehrliches Remis gegen „{lvl}“.', noUndo: 'Noch kein Zug zum Zurücknehmen', undoFree: 'Zug zurückgenommen (einmal pro Partie gratis)',
        hintCalc: 'Suche den besten Zug…', hintIs: 'Tipp: {san}', over: 'Partie beendet – tippe auf „Neu“', waitCpu: 'Einen Moment – der Computer ist am Zug',
        puzzle: 'Aufgabe', mateIn1: 'Matt in 1', mateIn2: 'Matt in 2', wMates: 'Weiß zieht und setzt matt', bMates: 'Schwarz zieht und setzt matt',
        wrong: 'Nicht ganz – versuch es noch einmal', good: 'Richtig! Und jetzt das Matt…', solvedT: 'Gelöst!', solvedLine: 'Matt gesetzt – sauber gelöst.', already: 'Schon gelöst – gut für die Übung.',
        nextP: 'Nächste Aufgabe', reset: 'Neu starten', solvedCount: '{n}/{t} gelöst', promo: 'Umwandeln in', resumed: 'Partie fortgesetzt', vs: 'gegen',
        allDone: 'Alle Aufgaben gelöst – großartig!', wTurn: 'Weiß am Zug', bTurn: 'Schwarz am Zug', resign: 'Aufgeben',
        rulesT: 'Schach – Regeln',
        rules: `<ul>
          <li><b>Ziel:</b> Setze den gegnerischen König matt – er steht im Schach und kann nicht entkommen.</li>
          <li><b>Züge:</b> König 1 Feld · Dame beliebig gerade/diagonal · Turm gerade · Läufer diagonal · Springer im „L“ (darf springen) · Bauer 1 Feld vor (vom Start 2), schlägt schräg.</li>
          <li><b>Rochade:</b> König zieht 2 Felder zum Turm, der Turm springt über ihn – nur wenn beide unbewegt sind, nichts dazwischen steht und der König nicht durch Schach zieht.</li>
          <li><b>En passant:</b> Zieht ein Bauer 2 Felder an deinem Bauern vorbei, darfst du ihn sofort im Vorbeigehen schlagen.</li>
          <li><b>Umwandlung:</b> Ein Bauer auf der letzten Reihe wird zu Dame, Turm, Läufer oder Springer.</li>
          <li><b>Remis:</b> Patt, dreifache Stellungswiederholung, 50 Züge ohne Bauernzug oder Schlagen, zu wenig Material zum Mattsetzen.</li>
          <li><b>Bedienung:</b> Figur antippen und Zielfeld tippen – oder einfach ziehen. Punkte zeigen erlaubte Züge, Ringe mögliche Schlagzüge.</li>
          <li><b>Aufgaben:</b> Finde das Matt in 1 oder 2 Zügen. Falsche Züge darfst du beliebig oft wiederholen.</li>
          <li><b>Sterne:</b> Sieg Leicht 10 · Mittel 20 · Schwer 40 ⭐, Remis die Hälfte, jede gelöste Aufgabe 5 ⭐.</li></ul>`,
        prevP: 'Vorherige Aufgabe', pQ: 'Dame', pR: 'Turm', pB: 'Läufer', pN: 'Springer'
      },
      ru: {
        modeGame: 'Партия', modePuzzle: 'Задачи', you: 'Вы', cpu: 'Компьютер', thinking: 'думает', yourTurn: 'Ваш ход', check: 'Шах!',
        newTitle: 'Новая партия', strength: 'Сила игры', colorQ: 'Ваш цвет', white: 'Белые', black: 'Чёрные', random: 'Случайно', start: 'Начать партию',
        flip: 'Повернуть', newG: 'Заново', mate: 'Мат', stalemate: 'Пат', threefold: 'Троекратное повторение позиции', fifty: 'Правило 50 ходов', material: 'Недостаточно материала', resign: 'Сдаться', resignQ: 'Точно сдать партию?', resigned: 'Ты сдался', notStarted: 'Партия ещё не началась',
        winLine: 'Сильная игра — вы победили компьютер ({lvl})!', loseTitle: 'В этот раз не вышло', loseLine: 'Хорошая борьба! Каждая партия делает тебя сильнее — сыграем ещё?',
        drawLine: 'Честная ничья против уровня «{lvl}».', noUndo: 'Пока нечего отменять', undoFree: 'Ход отменён (раз за партию бесплатно)',
        hintCalc: 'Ищу лучший ход…', hintIs: 'Подсказка: {san}', over: 'Партия окончена — нажмите «Заново»', waitCpu: 'Секунду — ходит компьютер',
        puzzle: 'Задача', mateIn1: 'Мат в 1 ход', mateIn2: 'Мат в 2 хода', wMates: 'Белые начинают и ставят мат', bMates: 'Чёрные начинают и ставят мат',
        wrong: 'Не совсем — попробуйте ещё раз', good: 'Верно! А теперь мат…', solvedT: 'Решено!', solvedLine: 'Мат поставлен — чистое решение.', already: 'Уже решено — хорошая тренировка.',
        nextP: 'Следующая задача', reset: 'Сначала', solvedCount: 'решено {n}/{t}', promo: 'Превратить в', resumed: 'Партия продолжена', vs: 'против',
        allDone: 'Все задачи решены — великолепно!', wTurn: 'Ход белых', bTurn: 'Ход чёрных', resign: 'Сдаться',
        rulesT: 'Шахматы — правила',
        rules: `<ul>
          <li><b>Цель:</b> поставить мат королю соперника — он под шахом и не может уйти.</li>
          <li><b>Ходы:</b> король на 1 поле · ферзь по прямым и диагоналям · ладья по прямым · слон по диагоналям · конь буквой «Г» (может перепрыгивать) · пешка на 1 поле вперёд (с начальной — на 2), бьёт наискосок.</li>
          <li><b>Рокировка:</b> король идёт на 2 поля к ладье, ладья перепрыгивает через него — если оба не ходили, между ними пусто и король не проходит через битое поле.</li>
          <li><b>Взятие на проходе:</b> если пешка соперника прыгнула на 2 поля мимо твоей пешки, её можно сразу взять «на проходе».</li>
          <li><b>Превращение:</b> пешка на последней горизонтали становится ферзём, ладьёй, слоном или конём.</li>
          <li><b>Ничья:</b> пат, троекратное повторение, 50 ходов без хода пешкой и взятия, недостаточно материала для мата.</li>
          <li><b>Управление:</b> нажмите фигуру, затем поле — или просто перетащите. Точки — возможные ходы, кольца — взятия.</li>
          <li><b>Задачи:</b> найдите мат в 1 или 2 хода. Ошибаться можно сколько угодно.</li>
          <li><b>Звёзды:</b> победа Лёгкий 10 · Средний 20 · Сложный 40 ⭐, ничья — половина, каждая решённая задача 5 ⭐.</li></ul>`,
        prevP: 'Предыдущая задача', pQ: 'Ферзь', pR: 'Ладья', pB: 'Слон', pN: 'Конь'
      },
      en: {
        modeGame: 'Game', modePuzzle: 'Puzzles', you: 'You', cpu: 'Computer', thinking: 'thinking', yourTurn: 'Your move', check: 'Check!',
        newTitle: 'New game', strength: 'Strength', colorQ: 'Your colour', white: 'White', black: 'Black', random: 'Random', start: 'Start game',
        flip: 'Flip', newG: 'New', mate: 'Checkmate', stalemate: 'Stalemate', threefold: 'Threefold repetition', fifty: '50-move rule', material: 'Insufficient material', resign: 'Resign', resignQ: 'Really resign this game?', resigned: 'You resigned', notStarted: 'The game has not started yet',
        winLine: 'Well played – you beat the computer ({lvl})!', loseTitle: 'Not this time', loseLine: 'Good fight! Every game makes you stronger – another one?',
        drawLine: 'An honest draw against “{lvl}”.', noUndo: 'No move to take back yet', undoFree: 'Move taken back (free once per game)',
        hintCalc: 'Looking for the best move…', hintIs: 'Hint: {san}', over: 'Game over – tap “New”', waitCpu: 'One moment – it’s the computer’s move',
        puzzle: 'Puzzle', mateIn1: 'Mate in 1', mateIn2: 'Mate in 2', wMates: 'White to move and mate', bMates: 'Black to move and mate',
        wrong: 'Not quite – try again', good: 'Correct! Now the mate…', solvedT: 'Solved!', solvedLine: 'Checkmate – neatly solved.', already: 'Already solved – good practice.',
        nextP: 'Next puzzle', reset: 'Restart', solvedCount: '{n}/{t} solved', promo: 'Promote to', resumed: 'Game resumed', vs: 'vs',
        allDone: 'All puzzles solved – brilliant!', wTurn: 'White to move', bTurn: 'Black to move', resign: 'Resign',
        rulesT: 'Chess – rules',
        rules: `<ul>
          <li><b>Goal:</b> checkmate the opponent’s king – it is in check and cannot escape.</li>
          <li><b>Moves:</b> king 1 square · queen any distance straight or diagonal · rook straight · bishop diagonal · knight in an “L” (may jump) · pawn 1 square forward (2 from the start), captures diagonally.</li>
          <li><b>Castling:</b> the king moves 2 squares towards a rook and the rook jumps over it – only if neither has moved, nothing stands between them and the king does not pass through check.</li>
          <li><b>En passant:</b> if a pawn moves 2 squares past your pawn, you may capture it right away “in passing”.</li>
          <li><b>Promotion:</b> a pawn reaching the last rank becomes a queen, rook, bishop or knight.</li>
          <li><b>Draw:</b> stalemate, threefold repetition, 50 moves without a pawn move or capture, not enough material to mate.</li>
          <li><b>Controls:</b> tap a piece, then the target square – or just drag it. Dots show legal moves, rings show possible captures.</li>
          <li><b>Puzzles:</b> find the mate in 1 or 2 moves. You may retry wrong moves as often as you like.</li>
          <li><b>Stars:</b> win Easy 10 · Medium 20 · Hard 40 ⭐, draw half of that, every solved puzzle 5 ⭐.</li></ul>`,
        prevP: 'Previous puzzle', pQ: 'Queen', pR: 'Rook', pB: 'Bishop', pN: 'Knight'
      },
      uk: {
        modeGame: 'Партія', modePuzzle: 'Задачі', you: 'Ти', cpu: 'Комп’ютер', thinking: 'думає', yourTurn: 'Твій хід', check: 'Шах!',
        newTitle: 'Нова партія', strength: 'Сила гри', colorQ: 'Твій колір', white: 'Білі', black: 'Чорні', random: 'Випадково', start: 'Почати партію',
        flip: 'Повернути', newG: 'Заново', mate: 'Мат', stalemate: 'Пат', threefold: 'Триразове повторення позиції', fifty: 'Правило 50 ходів', material: 'Недостатньо матеріалу', resign: 'Здатися', resignQ: 'Справді здати партію?', resigned: 'Ти здався', notStarted: 'Партія ще не почалася',
        winLine: 'Сильна гра — перемога над комп’ютером ({lvl})!', loseTitle: 'Цього разу не вийшло', loseLine: 'Гарна боротьба! Кожна партія додає досвіду — зіграємо ще?',
        drawLine: 'Чесна нічия проти рівня «{lvl}».', noUndo: 'Поки що немає чого скасовувати', undoFree: 'Хід скасовано (раз за партію безкоштовно)',
        hintCalc: 'Шукаю найкращий хід…', hintIs: 'Підказка: {san}', over: 'Партію завершено — натисни «Заново»', waitCpu: 'Секунду — ходить комп’ютер',
        puzzle: 'Задача', mateIn1: 'Мат в 1 хід', mateIn2: 'Мат у 2 ходи', wMates: 'Білі починають і ставлять мат', bMates: 'Чорні починають і ставлять мат',
        wrong: 'Не зовсім — спробуй ще раз', good: 'Правильно! А тепер мат…', solvedT: 'Розв’язано!', solvedLine: 'Мат поставлено — чисте розв’язання.', already: 'Уже розв’язано — гарне тренування.',
        nextP: 'Наступна задача', reset: 'Спочатку', solvedCount: 'розв’язано {n}/{t}', promo: 'Перетворити на', resumed: 'Партію продовжено', vs: 'проти',
        allDone: 'Усі задачі розв’язано — чудово!', wTurn: 'Хід білих', bTurn: 'Хід чорних', resign: 'Здатися',
        rulesT: 'Шахи — правила',
        rules: `<ul>
          <li><b>Мета:</b> поставити мат королю суперника — він під шахом і не може втекти.</li>
          <li><b>Ходи:</b> король на 1 поле · ферзь по прямих і діагоналях · тура по прямих · слон по діагоналях · кінь літерою «Г» (може перестрибувати) · пішак на 1 поле вперед (з початкової — на 2), б’є навскіс.</li>
          <li><b>Рокіровка:</b> король іде на 2 поля до тури, тура перестрибує через нього — якщо обидва не ходили, між ними порожньо і король не проходить через бите поле.</li>
          <li><b>Взяття на проході:</b> якщо пішак суперника стрибнув на 2 поля повз твого пішака, його можна одразу взяти «на проході».</li>
          <li><b>Перетворення:</b> пішак на останній горизонталі стає ферзем, турою, слоном або конем.</li>
          <li><b>Нічия:</b> пат, триразове повторення, 50 ходів без ходу пішаком і взяття, недостатньо матеріалу для мату.</li>
          <li><b>Керування:</b> натисни фігуру, потім поле — або просто перетягни. Крапки — можливі ходи, кільця — взяття.</li>
          <li><b>Задачі:</b> знайди мат в 1 або 2 ходи. Помилятися можна скільки завгодно.</li>
          <li><b>Зірки:</b> перемога Легкий 10 · Середній 20 · Складний 40 ⭐, нічия — половина, кожна розв’язана задача 5 ⭐.</li></ul>`,
        prevP: 'Попередня задача', pQ: 'Ферзь', pR: 'Тура', pB: 'Слон', pN: 'Кінь'
      }
    });

    const LV = { easy: { stars: 10, time: 700 }, medium: { stars: 20, time: 1000 }, hard: { stars: 40, time: 1000 } };
    const d = ctx.data;
    d.solved = Array.isArray(d.solved) ? d.solved : [];
    d.stats = d.stats || { w: 0, d: 0, l: 0 };
    d.mode = d.mode === 'puzzle' ? 'puzzle' : 'game';
    d.pIdx = Math.max(0, Math.min(PUZZLES.length - 1, d.pIdx | 0));

    let dead = false;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };

    /* ---------- engine (Worker from Blob URL, main-thread fallback) ---------- */
    const engine = (() => {
      let worker = null, url = null, seq = 0;
      const pending = new Map();
      function spawn() {
        try {
          const src = `var Core=(${ChessCore.toString()})();self.onmessage=function(e){var d=e.data,r;try{r=Core.think(d);}catch(err){r={error:String(err)}}r.id=d.id;self.postMessage(r);};`;
          if (!url) url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
          worker = new Worker(url);
          worker.onmessage = e => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data); } };
          worker.onerror = () => { const w = worker; worker = null; try { w.terminate(); } catch (e) { } const list = [...pending.values()]; pending.clear(); list.forEach(p => p.fallback()); };
        } catch (e) { worker = null; }
      }
      spawn();
      return {
        think(req) {
          return new Promise(res => {
            const id = ++seq;
            const fallback = () => setTimeout(() => res(C.think(Object.assign({}, req, { time: Math.min(req.time || 900, 650) }))), 16);
            if (worker) { const p = r => res(r); p.fallback = fallback; pending.set(id, p); worker.postMessage(Object.assign({ id }, req)); }
            else fallback();
          });
        },
        cancel() { if (pending.size && worker) { worker.terminate(); worker = null; pending.clear(); spawn(); } else pending.clear(); },
        destroy() { if (worker) worker.terminate(); worker = null; pending.clear(); if (url) URL.revokeObjectURL(url); },
        get usesWorker() { return !!worker; }
      };
    })();

    /* ---------- layout ---------- */
    const ui = Kit.shell(root, { top: true, cls: 'ch-wrap', theme: 'chess' });
    ui.el.classList.add('ch-root');
    const sheet = document.createElement('div'); sheet.className = 'ch-sheet'; sheet.innerHTML = symbolSheet(); ui.el.appendChild(sheet);
    const seg = Kit.segmented([{ id: 'game', label: s('modeGame') }, { id: 'puzzle', label: s('modePuzzle') }], d.mode, m => setMode(m));
    ui.top.appendChild(seg.el);
    const chip = document.createElement('button'); chip.className = 'ch-chip'; ui.top.appendChild(chip);
    chip.addEventListener('click', () => { if (mode === 'game') { UI.sound('click'); newGameDialog(); } });

    ui.board.innerHTML = `
      <div class="ch-bar ch-top"></div>
      <div class="ch-frame"><div class="ch-board">
        <div class="ch-sqs"></div><div class="ch-marks"></div><div class="ch-dots"></div><div class="ch-pieces"></div>
        <svg class="ch-arrow" viewBox="0 0 8 8" preserveAspectRatio="none"></svg><div class="ch-promo"></div>
      </div></div>
      <div class="ch-bar ch-bot"></div>
      <div class="ch-moves"></div>`;
    const $ = sel => ui.board.querySelector(sel);
    const elBoard = $('.ch-board'), elFrame = $('.ch-frame'), elSqs = $('.ch-sqs'), elMarks = $('.ch-marks'), elDots = $('.ch-dots'), elPieces = $('.ch-pieces'), elArrow = $('.ch-arrow'), elPromo = $('.ch-promo');
    const elTop = $('.ch-top'), elBot = $('.ch-bot'), elMoves = $('.ch-moves');

    /* ---------- board component ---------- */
    let pos = C.fromFen(C.START);   // the position the board shows
    let flipped = false;            // true = black at the bottom
    let selected = -1, targets = [], lastMove = 0, hintMove = 0;
    const pieceEls = new Map();     // sq -> element
    let canInteract = () => false, onUserMove = () => { };

    const colOf = sq => flipped ? 7 - (sq & 7) : (sq & 7);
    const rowOf = sq => flipped ? (sq >> 4) : 7 - (sq >> 4);
    const place = (el, sq) => { el.style.transform = `translate(${colOf(sq) * 100}%, ${rowOf(sq) * 100}%)`; };

    function drawSquares() {
      let h = '';
      for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
        const file = flipped ? 7 - col : col, rank = flipped ? row : 7 - row, light = (file + rank) % 2 === 1;
        h += `<div class="ch-sq ${light ? 'l' : 'd'}">${col === 0 ? `<i class="ch-rk">${rank + 1}</i>` : ''}${row === 7 ? `<i class="ch-fl">${'abcdefgh'[file]}</i>` : ''}</div>`;
      }
      elSqs.innerHTML = h;
    }

    function makePiece(p, sq) {
      const el = document.createElement('div'); el.className = 'ch-pc'; el.dataset.p = p;
      el.innerHTML = useSvg(CODE(p)); place(el, sq); elPieces.appendChild(el); pieceEls.set(sq, el); return el;
    }

    // Reconcile piece elements with pos; optional move animates the slide.
    function sync(move, opt = {}) {
      const b = pos.b;
      if (move) {
        const from = C.mFrom(move), to = C.mTo(move), flag = C.mFlag(move);
        const side = (b[to] & 8) ? 1 : 0;
        const capSq = flag === 2 ? to + (side ? 16 : -16) : to;
        const victim = pieceEls.get(capSq);
        if (victim && capSq !== from) { pieceEls.delete(capSq); victim.classList.add('ch-gone'); later(() => victim.remove(), 220); }
        const el = pieceEls.get(from);
        if (el) {
          pieceEls.delete(from); pieceEls.set(to, el);
          if (opt.dragged) { el.classList.add('ch-noanim'); place(el, to); void el.offsetWidth; el.classList.remove('ch-noanim'); }
          else { el.classList.add('ch-moving'); place(el, to); later(() => el.classList.remove('ch-moving'), 200); }
        }
        if (flag === 3) {
          const rf = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1, rel = pieceEls.get(rf);
          if (rel) { pieceEls.delete(rf); pieceEls.set(rt, rel); place(rel, rt); }
        }
      }
      // fix everything else (promotions, undo, loads)
      for (const [sq, el] of [...pieceEls]) {
        const p = b[sq];
        if (!p) { pieceEls.delete(sq); el.remove(); continue; }
        if (+el.dataset.p !== p) {
          el.dataset.p = p; const delay = move && C.mTo(move) === sq ? 170 : 0;
          if (delay) later(() => { el.innerHTML = useSvg(CODE(p)); el.classList.add('ch-pop'); }, delay); else el.innerHTML = useSvg(CODE(p));
        }
        if (!move || (sq !== C.mTo(move))) place(el, sq);
      }
      for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        if (b[sq] && !pieceEls.has(sq)) { const el = makePiece(b[sq], sq); if (move || opt.fadeIn) el.classList.add('ch-fade'); }
      }
      drawMarks();
    }

    // Animate a just-unmade move backwards (pos already restored).
    function syncBack(m) {
      const from = C.mFrom(m), to = C.mTo(m);
      const el = pieceEls.get(to);
      if (el) { pieceEls.delete(to); pieceEls.set(from, el); el.classList.add('ch-moving'); place(el, from); later(() => el.classList.remove('ch-moving'), 200); }
      if (C.mFlag(m) === 3) {
        const rf = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1, rel = pieceEls.get(rt);
        if (rel) { pieceEls.delete(rt); pieceEls.set(rf, rel); place(rel, rf); }
      }
      sync(null, { fadeIn: true });
    }

    function rebuild() { pieceEls.forEach(el => el.remove()); pieceEls.clear(); drawSquares(); sync(); }

    function mark(sq, cls) { return `<div class="ch-mk ${cls}" style="transform:translate(${colOf(sq) * 100}%,${rowOf(sq) * 100}%)"></div>`; }
    function drawMarks() {
      let h = '';
      if (lastMove) h += mark(C.mFrom(lastMove), 'ch-last') + mark(C.mTo(lastMove), 'ch-last');
      if (selected >= 0) h += mark(selected, 'ch-sel');
      if (C.inCheck(pos)) h += mark(pos.king[pos.side], 'ch-check');
      elMarks.innerHTML = h;
      let dots = '';
      const seen = new Set();
      for (const m of targets) {
        const to = C.mTo(m); if (seen.has(to)) continue; seen.add(to);
        dots += mark(to, pos.b[to] || C.mFlag(m) === 2 ? 'ch-ring' : 'ch-dot');
      }
      elDots.innerHTML = dots;
      drawArrow();
    }
    function drawArrow() {
      if (!hintMove) { elArrow.innerHTML = ''; return; }
      const f = C.mFrom(hintMove), t = C.mTo(hintMove);
      const x1 = colOf(f) + .5, y1 = rowOf(f) + .5, x2 = colOf(t) + .5, y2 = rowOf(t) + .5;
      const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const ex = x2 - ux * .34, ey = y2 - uy * .34, sx = x1 + ux * .18, sy = y1 + uy * .18;
      const hx = x2 - ux * .06, hy = y2 - uy * .06, px = -uy, py = ux, w = .3;
      elArrow.innerHTML = `<g class="ch-arr"><line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke-width=".24" stroke-linecap="round"/>
        <path d="M${hx} ${hy}L${ex + px * w} ${ey + py * w}L${ex - px * w} ${ey - py * w}Z"/><circle cx="${x1}" cy="${y1}" r=".16"/></g>`;
    }

    function setSelected(sq) {
      selected = sq;
      targets = sq >= 0 ? C.legalMoves(pos).filter(m => C.mFrom(m) === sq) : [];
      pieceEls.forEach((el, k) => el.classList.toggle('ch-lift', k === sq));
      drawMarks();
    }

    function sqAt(e) {
      const r = elBoard.getBoundingClientRect();
      const col = Math.floor((e.clientX - r.left) / r.width * 8), row = Math.floor((e.clientY - r.top) / r.height * 8);
      if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
      const file = flipped ? 7 - col : col, rank = flipped ? row : 7 - row;
      return rank * 16 + file;
    }

    let drag = null;
    function onDown(e) {
      if (e.button > 0 || elPromo.classList.contains('on')) return;
      if (!canInteract()) { if (mode === 'game' && thinking) ui.msg(s('waitCpu')); return; }
      const sq = sqAt(e); if (sq < 0) return;
      const p = pos.b[sq], mine = p && ((p & 8) ? 1 : 0) === pos.side;
      if (selected >= 0 && targets.some(m => C.mTo(m) === sq)) { tryMove(selected, sq, false); return; }
      if (!mine) { if (selected >= 0) setSelected(-1); return; }
      const was = selected === sq;
      if (!was) { setSelected(sq); ctx.sound('tap'); }
      const el = pieceEls.get(sq), r = elBoard.getBoundingClientRect();
      drag = { sq, el, was, x0: e.clientX, y0: e.clientY, started: false, rect: r, id: e.pointerId };
      try { elBoard.setPointerCapture(e.pointerId); } catch (er) { }
      e.preventDefault();
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.started && Math.hypot(dx, dy) > 5) { drag.started = true; drag.el && drag.el.classList.add('ch-drag'); }
      if (drag.started && drag.el) {
        const r = drag.rect, size = r.width / 8;
        drag.el.style.transform = `translate(${e.clientX - r.left - size / 2}px, ${e.clientY - r.top - size / 2}px) scale(1.14)`;
      }
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dr = drag; drag = null;
      try { elBoard.releasePointerCapture(e.pointerId); } catch (er) { }
      if (dr.started) {
        const sq = sqAt(e);
        if (dr.el) dr.el.classList.remove('ch-drag');
        if (sq >= 0 && sq !== dr.sq && targets.some(m => C.mTo(m) === sq)) { tryMove(dr.sq, sq, true); return; }
        if (dr.el) { dr.el.classList.add('ch-noanim'); place(dr.el, dr.sq); void dr.el.offsetWidth; dr.el.classList.remove('ch-noanim'); }
        if (sq >= 0 && sq !== dr.sq) ctx.sound('bad');
      } else if (dr.was) setSelected(-1);
    }
    function onCancel() { if (drag) { const dr = drag; drag = null; if (dr.el) { dr.el.classList.remove('ch-drag'); place(dr.el, dr.sq); } } }
    elBoard.addEventListener('pointerdown', onDown);
    elBoard.addEventListener('pointermove', onMove);
    elBoard.addEventListener('pointerup', onUp);
    elBoard.addEventListener('pointercancel', onCancel);
    elBoard.addEventListener('contextmenu', e => e.preventDefault());

    function tryMove(from, to, dragged) {
      const ms = targets.filter(m => C.mFrom(m) === from && C.mTo(m) === to);
      if (!ms.length) return;
      if (ms.length > 1) { // promotion
        const el = pieceEls.get(from);
        if (el && dragged) { el.classList.add('ch-noanim'); place(el, to); void el.offsetWidth; el.classList.remove('ch-noanim'); }
        showPromo(to, pos.side, pr => {
          if (!pr) { setSelected(-1); sync(); return; }
          const m = ms.find(x => C.mPromo(x) === pr);
          commit(m, dragged);
        });
        return;
      }
      commit(ms[0], dragged);
    }
    function commit(m, dragged) { setSelected(-1); onUserMove(m, dragged); }

    function showPromo(to, side, cb) {
      const col = colOf(to), down = rowOf(to) === 0;
      const opts = [C.Q, C.N, C.R, C.B];
      elPromo.innerHTML = `<div class="ch-pbox${down ? '' : ' up'}" style="left:${col * 12.5}%;${down ? 'top:0' : 'bottom:0'}">${opts.map(t => `<button data-t="${t}" aria-label="${UI.escapeHtml(s('promo') + ' ' + s(t === C.Q ? 'pQ' : t === C.R ? 'pR' : t === C.B ? 'pB' : 'pN'))}">${useSvg(CODE(t | (side ? 8 : 0)))}</button>`).join('')}</div>`;
      elPromo.classList.add('on');
      const done = v => { elPromo.classList.remove('on'); elPromo.innerHTML = ''; elPromo.onpointerdown = null; cb(v); };
      elPromo.onpointerdown = e => { e.stopPropagation(); const b = e.target.closest('button'); done(b ? +b.dataset.t : 0); };
    }

    // Apply a move to pos (the board position) with sounds + animation.
    function playMove(m, opt = {}) {
      const to = C.mTo(m), cap = pos.b[to] || C.mFlag(m) === 2;
      const sanStr = C.san(pos, m);
      C.make(pos, m);
      lastMove = m; hintMove = 0;
      sync(m, opt);
      const chk = C.inCheck(pos);
      if (!opt.silent) ctx.sound(chk ? 'bell' : cap ? 'brick' : C.mPromo(m) ? 'ok' : 'place');
      return { san: sanStr, cap: !!cap, check: chk };
    }

    function shake() { elFrame.classList.remove('ch-shake'); void elFrame.offsetWidth; elFrame.classList.add('ch-shake'); }
    function glow() { elFrame.classList.remove('ch-glow'); void elFrame.offsetWidth; elFrame.classList.add('ch-glow'); later(() => elFrame.classList.remove('ch-glow'), 1600); }

    /* =================================================================================
       Game mode
       ================================================================================= */
    let mode = d.mode, thinking = false, thinkTok = 0, hintBusy = false;
    const G = { fen0: C.START, moves: [], sans: [], caps: [], level: 'medium', color: 0, over: null, undoUsed: 0, flipped: false };

    function saveGame() {
      d.game = { fen0: G.fen0, moves: G.moves.slice(), level: G.level, color: G.color, over: G.over, undoUsed: G.undoUsed, flip: G.flipped };
      ctx.save();
    }
    function loadGame(gd) {
      G.fen0 = gd.fen0 || C.START; G.level = LV[gd.level] ? gd.level : 'medium'; G.color = gd.color ? 1 : 0; G.over = gd.over || null; G.undoUsed = gd.undoUsed | 0; G.flipped = !!gd.flip;
      G.moves = []; G.sans = []; G.caps = [];
      pos = C.fromFen(G.fen0);
      for (const u of gd.moves || []) {
        const m = C.parseUci(pos, u); if (!m) break;
        recordAndMake(m);
      }
      lastMove = pos.ply ? pos.uMove[pos.ply - 1] : 0;
    }
    function recordAndMake(m) {
      const to = C.mTo(m), flag = C.mFlag(m);
      const cap = flag === 2 ? (pos.side ? C.P : C.P | 8) : pos.b[to];
      G.sans.push(C.san(pos, m)); G.caps.push(cap); G.moves.push(C.uci(m));
      C.make(pos, m);
    }

    function lvlName(l) { return s(l); }

    function startGame(level, color) {
      engine.cancel(); thinking = false; thinkTok++;
      G.fen0 = C.START; G.moves = []; G.sans = []; G.caps = []; G.level = level; G.color = color; G.over = null; G.undoUsed = 0; G.flipped = false;
      d.lastLevel = level; d.lastColor = color;
      pos = C.fromFen(C.START); lastMove = 0; hintMove = 0; selected = -1; targets = [];
      flipped = color === 1;
      canInteract = userTurn; onUserMove = gameUserMove;
      rebuild(); renderGameChrome(); saveGame();
      ctx.sound('whoosh');
      afterMove();
    }

    function userTurn() { return !G.over && !thinking && pos.side === G.color; }

    function afterMove() {
      renderGameChrome();
      const st = C.status(pos);
      if (st.over) { finishGame(st); return; }
      if (pos.side !== G.color) computerMove();
      else ui.msg(st.check ? s('check') : s('yourTurn'), st.check ? 'bad' : '');
    }

    function computerMove() {
      thinking = true; const tok = ++thinkTok; const t0 = Date.now();
      renderGameChrome(); ui.msg('');
      const req = { fen: G.fen0, moves: G.moves.slice(), level: G.level, time: LV[G.level].time };
      engine.think(req).then(r => {
        if (dead || tok !== thinkTok || mode !== 'game') return;
        if (!r || r.error) r = C.think(Object.assign({}, req, { time: 600 }));
        const wait = Math.max(0, 420 - (Date.now() - t0));
        later(() => {
          if (tok !== thinkTok) return;
          thinking = false;
          const m = r && r.move ? C.parseUci(pos, r.move) : 0;
          if (!m) { renderGameChrome(); afterMove(); return; }
          G.sans.push(C.san(pos, m)); G.caps.push(C.mFlag(m) === 2 ? (pos.side ? C.P : C.P | 8) : pos.b[C.mTo(m)]); G.moves.push(C.uci(m));
          playMove(m);
          saveGame(); afterMove();
        }, wait);
      });
    }

    function gameUserMove(m, dragged) {
      if (!userTurn()) return;
      G.sans.push(C.san(pos, m)); G.caps.push(C.mFlag(m) === 2 ? (pos.side ? C.P : C.P | 8) : pos.b[C.mTo(m)]); G.moves.push(C.uci(m));
      playMove(m, { dragged });
      saveGame();
      afterMove();
    }

    function finishGame(st) {
      let res;
      if (st.draw) res = 'draw'; else res = st.winner === G.color ? 'win' : 'lose';
      G.over = { res, reason: st.reason };
      saveGame(); renderGameChrome();
      const reasonTxt = s(st.reason);
      ui.msg(reasonTxt + (res === 'draw' ? ' · ' + Kit.t('draw') : ''), res === 'win' ? 'good' : res === 'lose' ? 'bad' : 'accent');
      if (res === 'win') { glow(); d.stats.w++; } else if (res === 'draw') d.stats.d++; else d.stats.l++;
      const stars = res === 'win' ? LV[G.level].stars : res === 'draw' ? LV[G.level].stars / 2 : 0;
      if (res === 'win' && G.level !== 'easy') ctx.badge('chess_win');
      ctx.save();
      later(() => {
        Kit.result(ctx, {
          result: res,
          title: res === 'lose' ? s('loseTitle') : res === 'win' ? Kit.t('win') : Kit.t('draw'),
          lines: [reasonTxt, res === 'win' ? s('winLine', { lvl: lvlName(G.level) }) : res === 'lose' ? s('loseLine') : s('drawLine', { lvl: lvlName(G.level) })],
          stars, onAgain: () => newGameDialog(true)
        });
      }, res === 'win' ? 900 : 700);
    }

    // Plies to take back so that it is the player's turn again with one of their moves undone.
    function undoCount() {
      const n = thinking ? 1 : 2;
      return n <= G.moves.length ? n : 0;
    }
    function undo() {
      if (mode !== 'game') return;
      if (G.over) { ctx.toast(s('over')); return; }
      if (!undoCount()) { ctx.toast(s('noUndo')); ctx.sound('bad'); return; }
      const doIt = () => {
        const n = undoCount(); if (!n) return;
        engine.cancel(); thinking = false; thinkTok++;
        for (let i = 0; i < n; i++) { G.moves.pop(); G.sans.pop(); G.caps.pop(); C.unmake(pos); }
        lastMove = pos.ply ? pos.uMove[pos.ply - 1] : 0; hintMove = 0; setSelected(-1);
        sync(null, { fadeIn: true }); saveGame(); ctx.sound('whoosh'); afterMove();
      };
      if (G.undoUsed === 0) { G.undoUsed = 1; doIt(); ctx.toast(s('undoFree')); return; }
      Kit.useHelp(ctx, 'undo').then(ok => {
        if (!ok || dead || mode !== 'game' || G.over) return;
        G.undoUsed++; doIt();
      });
    }

    function gameHint() {
      if (G.over) { ctx.toast(s('over')); return; }
      if (!userTurn() || hintBusy) { ui.msg(s('waitCpu')); return; }
      Kit.useHelp(ctx).then(ok => {
        if (!ok || dead || !userTurn()) return;
        hintBusy = true; ui.msg(s('hintCalc'), 'accent');
        const ply = G.moves.length;
        engine.think({ fen: G.fen0, moves: G.moves.slice(), level: 'hint', time: 900 }).then(r => {
          hintBusy = false;
          if (dead || mode !== 'game' || G.moves.length !== ply || !r || !r.move) return;
          hintMove = C.parseUci(pos, r.move); drawMarks();
          ui.msg(s('hintIs', { san: figSan(r.san || r.move) }), 'accent');
        });
      });
    }

    function newGameDialog(force) {
      let level = d.lastLevel && LV[d.lastLevel] ? d.lastLevel : 'medium', color = d.lastColor === 1 ? 1 : d.lastColor === 'r' ? 'r' : 0;
      const hasGame = !!d.game && !force;
      const m = UI.modal({
        title: s('newTitle'), dismissible: hasGame,
        html: `<div class="ch-new">
          <div class="ch-lbl">${s('strength')}</div>
          <div class="ch-opts ch-lv">${['easy', 'medium', 'hard'].map((l, i) => `<button data-l="${l}"><span class="ch-pips">${'<i></i>'.repeat(i + 1)}</span>${UI.escapeHtml(lvlName(l))}<small>${LV[l].stars} ⭐</small></button>`).join('')}</div>
          <div class="ch-lbl">${s('colorQ')}</div>
          <div class="ch-opts ch-col">
            <button data-c="0">${useSvg('wk', 'ch-ck')}<span>${s('white')}</span></button>
            <button data-c="r"><span class="ch-rnd">${useSvg('wk', 'ch-ck')}${useSvg('bk', 'ch-ck')}</span><span>${s('random')}</span></button>
            <button data-c="1">${useSvg('bk', 'ch-ck')}<span>${s('black')}</span></button>
          </div></div>`,
        actions: [{ label: s('start'), cls: 'btn-primary', onClick: () => {
          const c = color === 'r' ? (Math.random() < .5 ? 0 : 1) : color;
          d.lastColor = color; setModeQuiet('game'); startGame(level, c);
        } }]
      });
      // symbols must be resolvable inside the modal: inject the sheet there too
      const sh = document.createElement('div'); sh.className = 'ch-sheet'; sh.innerHTML = symbolSheet().replace(/id="chs-/g, 'id="chm-').replace(/#chs-/g, '#chm-'); m.box.appendChild(sh);
      m.box.querySelectorAll('use').forEach(u => u.setAttribute('href', u.getAttribute('href').replace('#chs-', '#chm-')));
      const paint = () => {
        m.box.querySelectorAll('[data-l]').forEach(b => b.classList.toggle('on', b.dataset.l === level));
        m.box.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', String(b.dataset.c) === String(color)));
      };
      m.box.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { level = b.dataset.l; UI.sound('toggle'); paint(); }));
      m.box.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { color = b.dataset.c === 'r' ? 'r' : +b.dataset.c; UI.sound('toggle'); paint(); }));
      paint();
    }

    function onNew() {
      if (mode === 'puzzle') { loadPuzzle(pIdx); return; }
      if (G.moves.length && !G.over) Kit.confirm(Kit.t('confirmNew'), () => newGameDialog(true));
      else newGameDialog(true);
    }

    /* ---------- chrome (bars, captured, moves) ---------- */
    const VALS = [0, 1, 3, 3, 5, 9, 0];
    function capsHtml(list) {
      const order = [C.P, C.N, C.B, C.R, C.Q];
      list = list.slice().sort((a, b) => order.indexOf(a & 7) - order.indexOf(b & 7));
      return list.map((p, i) => `<span class="ch-cp${i && (list[i - 1] & 7) === (p & 7) ? ' tight' : ''}">${useSvg(CODE(p))}</span>`).join('');
    }
    function material(side) {
      let v = 0; for (let sq = 0; sq < 120; sq++) { if (sq & 0x88) { sq += 7; continue; } const p = pos.b[sq]; if (p && ((p & 8) ? 1 : 0) === side) v += VALS[p & 7]; }
      return v;
    }
    function barHtml(side, isPlayer) {
      // captured by `side` = opponent pieces in G.caps made by side
      const caps = [];
      G.caps.forEach((p, i) => { if (!p) return; const mover = ((i + (G.fen0.split(' ')[1] === 'b' ? 1 : 0)) % 2); if (mover === side) caps.push(p); });
      const diff = material(side) - material(side ^ 1);
      const name = isPlayer ? s('you') : `${s('cpu')} · ${lvlName(G.level)}`;
      const think = !isPlayer && thinking;
      const turn = !G.over && pos.side === side;
      return `<span class="ch-ava ${side ? 'b' : 'w'}${turn ? ' turn' : ''}">${useSvg(side ? 'bk' : 'wk')}</span>
        <span class="ch-who"><b>${UI.escapeHtml(name)}</b><span class="ch-caps">${capsHtml(caps)}${diff > 0 ? `<em>+${diff}</em>` : ''}</span></span>
        <span class="ch-think${think ? ' on' : ''}"><i></i><i></i><i></i><small>${s('thinking')}</small></span>`;
    }
    function renderGameChrome() {
      if (mode !== 'game') return;
      const bottomSide = flipped ? 1 : 0;
      elBot.innerHTML = barHtml(bottomSide, bottomSide === G.color);
      elTop.innerHTML = barHtml(bottomSide ^ 1, (bottomSide ^ 1) === G.color);
      chip.innerHTML = `<span class="ch-dotc ${G.color ? 'b' : 'w'}"></span>${UI.escapeHtml(lvlName(G.level))}`;
      chip.hidden = false;
      // move list
      const startBlack = G.fen0.split(' ')[1] === 'b';
      let h = '', num = parseInt(G.fen0.split(' ')[5] || '1', 10);
      G.sans.forEach((sn, i) => {
        const white = startBlack ? i % 2 === 1 : i % 2 === 0;
        if (white || i === 0) h += `<span class="ch-mn">${num}.${white ? '' : '…'}</span>`;
        h += `<span class="ch-mv${i === G.sans.length - 1 ? ' cur' : ''}">${figSan(sn)}</span>`;
        if (!white) num++;
      });
      elMoves.innerHTML = h || `<span class="ch-mn ch-empty">1.</span>`;
      elMoves.scrollLeft = elMoves.scrollWidth;
      if (btnUndo) btnUndo.disabled = !G.moves.length || !!G.over;
    }

    /* =================================================================================
       Puzzle mode
       ================================================================================= */
    let pIdx = d.pIdx, P0 = null, pStep = 0, pBusy = false, pDone = false;

    function loadPuzzle(i) {
      engine.cancel(); thinking = false; thinkTok++;
      pIdx = (i + PUZZLES.length) % PUZZLES.length; d.pIdx = pIdx; ctx.save();
      P0 = PUZZLES[pIdx]; pStep = 0; pBusy = false; pDone = false;
      pos = C.fromFen(P0.fen); lastMove = 0; hintMove = 0; selected = -1; targets = [];
      flipped = pos.side === 1;
      rebuild(); renderPuzzleChrome();
      ui.msg(pos.side ? s('bMates') : s('wMates'));
    }
    function movesLeft() { return P0.n - pStep; }

    function puzzleUserMove(m, dragged) {
      if (pBusy || pDone) return;
      const left = movesLeft();
      if (!C.mateAfter(pos, m, left)) {
        // wrong: show the move briefly, then slide back
        pBusy = true;
        playMove(m, { dragged, silent: true });
        ctx.sound('bad'); shake(); ui.msg(s('wrong'), 'bad');
        later(() => { C.unmake(pos); lastMove = pos.ply ? pos.uMove[pos.ply - 1] : 0; syncBack(m); pBusy = false; }, 560);
        return;
      }
      const r = playMove(m, { dragged });
      pStep++;
      if (C.status(pos).over) { puzzleSolved(); return; }
      ui.msg(s('good'), 'good');
      pBusy = true;
      later(() => {
        // defender reply: the stored line if it fits, else the toughest defence
        const replies = C.legalMoves(pos);
        let reply = 0;
        const stored = P0.sol[pStep * 2 - 1];
        if (stored) { const sm = C.parseUci(pos, stored); if (sm && C.uci(m) === P0.sol[(pStep - 1) * 2]) reply = sm; }
        if (!reply) {
          let bestCnt = 1e9;
          for (const rp of replies) { C.make(pos, rp); const cnt = C.mateKeys(pos, movesLeft()).length; C.unmake(pos); if (cnt < bestCnt) { bestCnt = cnt; reply = rp; } }
        }
        playMove(reply); pBusy = false; renderPuzzleChrome();
        ui.msg(pos.side ? s('bMates') : s('wMates'));
      }, 520);
      renderPuzzleChrome();
      return r;
    }

    function puzzleSolved() {
      pDone = true; glow();
      const id = P0.id, first = !d.solved.includes(id);
      if (first) { d.solved.push(id); ctx.save(); }
      renderPuzzleChrome();
      if (d.solved.length >= 10) ctx.badge('chess_puzzles');
      ui.msg(s('solvedT'), 'good');
      later(() => {
        const all = d.solved.length >= PUZZLES.length;
        Kit.result(ctx, {
          result: 'win', title: s('solvedT'),
          lines: [first ? s('solvedLine') : s('already'), all ? s('allDone') : s('solvedCount', { n: d.solved.length, t: PUZZLES.length })],
          stars: first ? 5 : 0, quiet: !first,
          onNext: () => loadPuzzle(nextUnsolved()), nextLabel: s('nextP'),
          onAgain: () => loadPuzzle(pIdx), againLabel: s('reset')
        });
        if (!first) UI.sound('ok');
      }, 750);
    }
    function nextUnsolved() {
      for (let k = 1; k <= PUZZLES.length; k++) { const j = (pIdx + k) % PUZZLES.length; if (!d.solved.includes(PUZZLES[j].id)) return j; }
      return (pIdx + 1) % PUZZLES.length;
    }

    function puzzleHint() {
      if (pDone || pBusy) return;
      Kit.useHelp(ctx).then(ok => {
        if (!ok || dead || mode !== 'puzzle' || pDone) return;
        let m = 0;
        const stored = P0.sol[pStep * 2];
        if (stored) { const sm = C.parseUci(pos, stored); if (sm && C.mateAfter(pos, sm, movesLeft())) m = sm; }
        if (!m) m = C.mateKeys(pos, movesLeft())[0] || 0;
        hintMove = m; drawMarks();
        if (m) ui.msg(s('hintIs', { san: figSan(C.san(pos, m)) }), 'accent');
      });
    }

    function renderPuzzleChrome() {
      if (mode !== 'puzzle') return;
      const solved = d.solved.includes(P0.id);
      elTop.innerHTML = `<button class="ch-nav" data-nav="-1" aria-label="${UI.escapeHtml(s('prevP'))}">${IC.prev}</button>
        <span class="ch-ptitle"><b>${s('puzzle')} ${pIdx + 1}<small>/${PUZZLES.length}</small></b><span class="ch-tag n${P0.n}">${P0.n === 1 ? s('mateIn1') : s('mateIn2')}</span>${solved ? '<span class="ch-ok">✓</span>' : ''}</span>
        <button class="ch-nav" data-nav="1" aria-label="${UI.escapeHtml(s('nextP'))}">${IC.next}</button>`;
      elTop.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => { UI.sound('click'); loadPuzzle(pIdx + +b.dataset.nav); }));
      const side = pos.side;
      elBot.innerHTML = `<span class="ch-ava ${P0.side ? 'b' : 'w'} turn">${useSvg(P0.side ? 'bk' : 'wk')}</span>
        <span class="ch-who"><b>${side ? s('bTurn') : s('wTurn')}</b><span class="ch-steps">${Array.from({ length: P0.n }, (_, i) => `<i class="${i < pStep ? 'done' : ''}"></i>`).join('')}</span></span>
        <span class="ch-pcount">${s('solvedCount', { n: d.solved.length, t: PUZZLES.length })}</span>`;
      chip.innerHTML = `🧩 ${d.solved.length}/${PUZZLES.length}`;
      chip.hidden = false;
      elMoves.innerHTML = PUZZLES.map((p, i) => `<button class="ch-pz${i === pIdx ? ' cur' : ''}${d.solved.includes(p.id) ? ' ok' : ''}${p.n === 2 ? ' two' : ''}" data-i="${i}">${i + 1}</button>`).join('');
      elMoves.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { UI.sound('click'); loadPuzzle(+b.dataset.i); }));
      const cur = elMoves.querySelector('.cur');
      if (cur) { const r0 = elMoves.getBoundingClientRect(), r1 = cur.getBoundingClientRect(); elMoves.scrollLeft += (r1.left - r0.left) - (r0.width - r1.width) / 2; }
    }

    /* =================================================================================
       Tools + mode switching
       ================================================================================= */
    let btnUndo = null;
    function renderTools() {
      ui.tools.innerHTML = '';
      const lbl = (ic, t) => `<span class="ico">${ic}</span>${UI.escapeHtml(t)}`;
      if (mode === 'game') {
        ui.tool(lbl(IC.neu, s('newG')), onNew);
        btnUndo = ui.tool(lbl(IC.undo, Kit.t('undo')), undo);
        ui.tool(lbl(IC.hint, Kit.t('hint')), gameHint);
        ui.tool(lbl(IC.flag, s('resign')), resign);
        ui.tool(lbl(IC.flip, s('flip')), flip);
        ui.tool(lbl(IC.rules, Kit.t('rules')), showRules);
      } else {
        btnUndo = null;
        ui.tool(lbl(IC.reset, s('reset')), () => loadPuzzle(pIdx));
        ui.tool(lbl(IC.hint, Kit.t('hint')), puzzleHint);
        ui.tool(lbl(IC.flip, s('flip')), flip);
        ui.tool(lbl(IC.rules, Kit.t('rules')), showRules);
      }
    }
    function showRules() { Kit.rules(s('rulesT'), s('rules')); }
    // Resign: the computer wins; no stars.
    function resign() {
      if (mode !== 'game' || G.over || !G.moves.length) { ctx.toast(s(G && G.over ? 'over' : 'notStarted')); return; }
      Kit.confirm(s('resignQ'), () => {
        if (G.over) return;
        engine.cancel(); thinking = false; thinkTok++; hintMove = 0;
        finishGame({ winner: 1 - G.color, reason: 'resigned' });
      });
    }
    function flip() {
      flipped = !flipped;
      if (mode === 'game') { G.flipped = flipped !== (G.color === 1); saveGame(); }
      ctx.sound('whoosh');
      elBoard.classList.add('ch-flipping');
      later(() => elBoard.classList.remove('ch-flipping'), 260);
      rebuild();
      if (mode === 'game') renderGameChrome(); else renderPuzzleChrome();
    }

    function setModeQuiet(m) { if (mode !== m) { seg.set(m); setMode(m); } }
    function setMode(m) {
      mode = m; d.mode = m; ctx.save();
      engine.cancel(); thinking = false; thinkTok++; hintBusy = false;
      ui.el.classList.toggle('ch-pmode', m === 'puzzle');
      renderTools();
      if (m === 'puzzle') {
        canInteract = () => !pBusy && !pDone;
        onUserMove = puzzleUserMove;
        loadPuzzle(pIdx);
      } else {
        canInteract = userTurn;
        onUserMove = gameUserMove;
        if (d.game) {
          loadGame(d.game);
          flipped = (G.color === 1) !== G.flipped;
          rebuild(); renderGameChrome();
          if (G.over) ui.msg(s(G.over.reason) + ' · ' + s('over'), 'accent');
          else afterMove();
        } else {
          canInteract = () => false; // nothing to play until a game is started
          pos = C.fromFen(C.START); lastMove = 0; flipped = false; rebuild(); renderGameChrome(); ui.msg('');
          later(() => newGameDialog(false), 250);
        }
      }
    }

    setMode(mode);

    // Debug / test hook
    root.__game = {
      core: C,
      state: () => ({ mode, fen: C.toFen(pos), moves: G.moves.slice(), sans: G.sans.slice(), level: G.level, color: G.color, over: G.over, thinking, puzzle: mode === 'puzzle' ? { idx: pIdx, id: P0.id, step: pStep, done: pDone } : null, worker: engine.usesWorker }),
      legal: () => C.legalMoves(pos).map(C.uci),
      move(u) { const m = C.parseUci(pos, u); if (!m || !canInteract()) return false; onUserMove(m, false); return true; },
      start(level = 'medium', color = 0) { setModeQuiet('game'); startGame(level, color); },
      think: (level = 'hard') => engine.think({ fen: C.toFen(pos), moves: [], level, time: 1000 }),
      mode: m => setModeQuiet(m),
      puzzle: i => { setModeQuiet('puzzle'); loadPuzzle(i); },
      solve() { if (mode !== 'puzzle') return null; const k = C.mateKeys(pos, movesLeft())[0]; if (k) onUserMove(k, false); return k ? C.uci(k) : null; },
      perft: n => C.perft(C.fromFen(C.START), n)
    };

    return {
      destroy() {
        dead = true;
        engine.destroy();
        timers.forEach(clearTimeout); timers.clear();
        elBoard.removeEventListener('pointerdown', onDown);
        elBoard.removeEventListener('pointermove', onMove);
        elBoard.removeEventListener('pointerup', onUp);
        elBoard.removeEventListener('pointercancel', onCancel);
        delete root.__game;
      }
    };
  }
})();
