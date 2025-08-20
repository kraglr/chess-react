import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
// Main App component
const App = () => {
  // State to represent the chessboard
  // Each element in the array represents a square, from a8 to h1.
  // 'p' for pawn, 'r' for rook, 'n' for knight, 'b' for bishop, 'q' for queen, 'k' for king.
  // Uppercase for White pieces, lowercase for Black pieces.
  // Null represents an empty square.
  const initialBoard = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"],
  ];

  const [board, setBoard] = useState(initialBoard);
  // State to keep track of the currently selected piece's position [row, col]
  const [selectedPiece, setSelectedPiece] = useState(null);
  // State to keep track of the current turn: 'white' or 'black'
  const [turn, setTurn] = useState("white");
  // State for displaying messages to the user
  const [message, setMessage] = useState("");
  // State to store legal moves for the selected piece
  const [legalMoves, setLegalMoves] = useState([]);
  // State to track game over status
  const [gameOver, setGameOver] = useState(false);
  // State to track if the current player's king is in check
  const [isInCheck, setIsInCheck] = useState(false);
  // State to track if kings have moved (for castling)
  const [hasKingMoved, setHasKingMoved] = useState({
    white: false,
    black: false,
  });
  // State to track if rooks have moved (for castling)
  const [hasRookMoved, setHasRookMoved] = useState({
    white: { kingside: false, queenside: false },
    black: { kingside: false, queenside: false },
  });

  // Mapping piece symbols to their Unicode characters
  const pieceSymbols = {
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    p: "♟",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
    P: "♙",
  };

  /**
   * Determines the color of a piece.
   * @param {string} piece - The piece symbol ('p', 'R', etc.).
   * @returns {string} 'white', 'black', or 'none' if the piece is null.
   */
  const getPieceColor = useCallback((piece) => {
    if (!piece) return "none";
    return piece === piece.toUpperCase() ? "white" : "black";
  }, []);

  /**
   * Checks if coordinates are within the board bounds.
   * @param {number} row - The row index.
   * @param {number} col - The column index.
   * @returns {boolean} True if valid, false otherwise.
   */
  const isValidCoord = useCallback((row, col) => {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }, []);

  /**
   * Finds the king's position for a given color.
   * @param {Array<Array<string|null>>} currentBoard - The board state to search.
   * @param {string} color - 'white' or 'black'.
   * @returns {Array<number>|null} [row, col] of the king, or null if not found.
   */
  const findKing = useCallback((currentBoard, color) => {
    const kingSymbol = color === "white" ? "K" : "k";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (currentBoard[r][c] === kingSymbol) {
          return [r, c];
        }
      }
    }
    return null; // Should not happen in a valid game
  }, []);

  /**
   * Checks if a specific square is attacked by the opponent's pieces.
   * This is a critical helper for check detection.
   * @param {Array<Array<string|null>>} currentBoard - The board state.
   * @param {number} targetRow - The row of the square to check.
   * @param {number} targetCol - The column of the square to check.
   * @param {string} attackingColor - The color of the pieces that might be attacking ('white' or 'black').
   * @returns {boolean} True if the square is attacked, false otherwise.
   */
  const isSquareAttacked = useCallback(
    (currentBoard, targetRow, targetCol, attackingColor) => {
      // Check for pawn attacks
      const pawnDirection = attackingColor === "white" ? 1 : -1; // Pawns attack "down" for white, "up" for black
      const pawnAttackDeltas = [
        [pawnDirection, -1],
        [pawnDirection, 1],
      ];
      for (const [dr, dc] of pawnAttackDeltas) {
        const r = targetRow + dr;
        const c = targetCol + dc;
        if (isValidCoord(r, c)) {
          const piece = currentBoard[r][c];
          if (
            piece &&
            getPieceColor(piece) === attackingColor &&
            piece.toLowerCase() === "p"
          ) {
            return true;
          }
        }
      }

      // Check for Knight attacks
      const knightMoves = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      for (const [dr, dc] of knightMoves) {
        const r = targetRow + dr;
        const c = targetCol + dc;
        if (isValidCoord(r, c)) {
          const piece = currentBoard[r][c];
          if (
            piece &&
            getPieceColor(piece) === attackingColor &&
            piece.toLowerCase() === "n"
          ) {
            return true;
          }
        }
      }

      // Check for Rook/Queen attacks (straight lines)
      const straightDeltas = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      for (const [dr, dc] of straightDeltas) {
        let r = targetRow + dr;
        let c = targetCol + dc;
        while (isValidCoord(r, c)) {
          const piece = currentBoard[r][c];
          if (piece) {
            if (
              getPieceColor(piece) === attackingColor &&
              (piece.toLowerCase() === "r" || piece.toLowerCase() === "q")
            ) {
              return true;
            }
            break; // Blocked by any piece
          }
          r += dr;
          c += dc;
        }
      }

      // Check for Bishop/Queen attacks (diagonal lines)
      const diagonalDeltas = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];
      for (const [dr, dc] of diagonalDeltas) {
        let r = targetRow + dr;
        let c = targetCol + dc;
        while (isValidCoord(r, c)) {
          const piece = currentBoard[r][c];
          if (piece) {
            if (
              getPieceColor(piece) === attackingColor &&
              (piece.toLowerCase() === "b" || piece.toLowerCase() === "q")
            ) {
              return true;
            }
            break; // Blocked by any piece
          }
          r += dr;
          c += dc;
        }
      }

      // Check for King attacks (adjacent squares)
      const kingDeltas = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ];
      for (const [dr, dc] of kingDeltas) {
        const r = targetRow + dr;
        const c = targetCol + dc;
        if (isValidCoord(r, c)) {
          const piece = currentBoard[r][c];
          if (
            piece &&
            getPieceColor(piece) === attackingColor &&
            piece.toLowerCase() === "k"
          ) {
            return true;
          }
        }
      }

      return false;
    },
    [isValidCoord, getPieceColor]
  );

  /**
   * Calculates all theoretical moves for a given piece at a specific position,
   * without considering if they put the king in check.
   * @param {Array<Array<string|null>>} currentBoard - The current state of the board.
   * @param {number} row - The row of the piece.
   * @param {number} col - The column of the piece.
   * @returns {Array<Array<number>>} An array of [row, col] pairs representing theoretical moves.
   */
  const calculateTheoreticalMoves = useCallback(
    (currentBoard, row, col) => {
      const piece = currentBoard[row][col];
      if (!piece) return [];

      const isWhite = getPieceColor(piece) === "white";
      const currentPlayerColor = isWhite ? "white" : "black";
      let moves = [];

      // Helper for straight line moves (Rook, Bishop, Queen)
      const checkDirections = (deltas) => {
        for (const [dr, dc] of deltas) {
          let r = row + dr;
          let c = col + dc;
          while (isValidCoord(r, c)) {
            const targetPiece = currentBoard[r][c];
            if (targetPiece) {
              // If it's an opponent's piece, it's a capture
              if (getPieceColor(targetPiece) !== currentPlayerColor) {
                moves.push([r, c]);
              }
              break; // Blocked by own piece or captured opponent's piece
            }
            moves.push([r, c]);
            r += dr;
            c += dc;
          }
        }
      };

      switch (piece.toLowerCase()) {
        case "p": // Pawn
          const direction = isWhite ? -1 : 1; // White moves up, Black moves down
          const startRow = isWhite ? 6 : 1;

          // Single square move
          if (
            isValidCoord(row + direction, col) &&
            !currentBoard[row + direction][col]
          ) {
            moves.push([row + direction, col]);
          }

          // Initial two-square move
          if (
            row === startRow &&
            !currentBoard[row + direction][col] &&
            !currentBoard[row + 2 * direction][col]
          ) {
            moves.push([row + 2 * direction, col]);
          }

          // Captures
          const captureOffsets = [-1, 1];
          for (const offset of captureOffsets) {
            if (isValidCoord(row + direction, col + offset)) {
              const targetPiece = currentBoard[row + direction][col + offset];
              if (
                targetPiece &&
                getPieceColor(targetPiece) !== currentPlayerColor
              ) {
                moves.push([row + direction, col + offset]);
              }
            }
          }
          // TODO: En passant logic here (requires tracking last move)
          break;

        case "r": // Rook
          checkDirections([
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ]);
          break;

        case "n": // Knight
          const knightMoves = [
            [-2, -1],
            [-2, 1],
            [-1, -2],
            [-1, 2],
            [1, -2],
            [1, 2],
            [2, -1],
            [2, 1],
          ];
          for (const [dr, dc] of knightMoves) {
            const r = row + dr;
            const c = col + dc;
            if (isValidCoord(r, c)) {
              const targetPiece = currentBoard[r][c];
              if (
                !targetPiece ||
                getPieceColor(targetPiece) !== currentPlayerColor
              ) {
                moves.push([r, c]);
              }
            }
          }
          break;

        case "b": // Bishop
          checkDirections([
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ]);
          break;

        case "q": // Queen
          checkDirections([
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0], // Rook moves
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1], // Bishop moves
          ]);
          break;

        case "k": // King
          const kingMoves = [
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
            [1, 1],
          ];
          for (const [dr, dc] of kingMoves) {
            const r = row + dr;
            const c = col + dc;
            if (isValidCoord(r, c)) {
              const targetPiece = currentBoard[r][c];
              if (
                !targetPiece ||
                getPieceColor(targetPiece) !== currentPlayerColor
              ) {
                moves.push([r, c]);
              }
            }
          }

          // Castling Logic
          const kingRow = isWhite ? 7 : 0;
          const opponentColor = isWhite ? "black" : "white";

          // Kingside Castling
          if (
            !hasKingMoved[currentPlayerColor] &&
            !hasRookMoved[currentPlayerColor].kingside &&
            currentBoard[kingRow][5] === null &&
            currentBoard[kingRow][6] === null &&
            currentBoard[kingRow][7]?.toLowerCase() === "r" &&
            getPieceColor(currentBoard[kingRow][7]) === currentPlayerColor &&
            !isSquareAttacked(currentBoard, kingRow, col, opponentColor) && // King not in check
            !isSquareAttacked(currentBoard, kingRow, 5, opponentColor) && // Square F not attacked
            !isSquareAttacked(currentBoard, kingRow, 6, opponentColor) // Square G not attacked
          ) {
            moves.push([kingRow, 6]); // King moves to G file
          }

          // Queenside Castling
          if (
            !hasKingMoved[currentPlayerColor] &&
            !hasRookMoved[currentPlayerColor].queenside &&
            currentBoard[kingRow][1] === null &&
            currentBoard[kingRow][2] === null &&
            currentBoard[kingRow][3] === null &&
            currentBoard[kingRow][0]?.toLowerCase() === "r" &&
            getPieceColor(currentBoard[kingRow][0]) === currentPlayerColor &&
            !isSquareAttacked(currentBoard, kingRow, col, opponentColor) && // King not in check
            !isSquareAttacked(currentBoard, kingRow, 2, opponentColor) && // Square C not attacked
            !isSquareAttacked(currentBoard, kingRow, 3, opponentColor) // Square D not attacked
          ) {
            moves.push([kingRow, 2]); // King moves to C file
          }
          break;

        default:
          break;
      }
      return moves;
    },
    [getPieceColor, isValidCoord, hasKingMoved, hasRookMoved, isSquareAttacked]
  );

  /**
   * Filters a list of theoretical moves, returning only those that do not result
   * in the current player's king being in check.
   * @param {Array<Array<string|null>>} currentBoard - The board state.
   * @param {number} fromRow - The row of the piece being moved.
   * @param {number} fromCol - The column of the piece being moved.
   * @param {Array<Array<number>>} theoreticalMoves - List of moves generated by calculateTheoreticalMoves.
   * @param {string} currentPlayerColor - The color of the player whose turn it is.
   * @returns {Array<Array<number>>} A filtered list of legal moves.
   */
  const getLegalMovesAfterCheckFilter = useCallback(
    (currentBoard, fromRow, fromCol, theoreticalMoves, currentPlayerColor) => {
      const legalFilteredMoves = [];
      const pieceToMove = currentBoard[fromRow][fromCol];

      for (const [toRow, toCol] of theoreticalMoves) {
        // Simulate the move on a temporary board
        const tempBoard = currentBoard.map((row) => [...row]);
        const isCastlingMove =
          pieceToMove.toLowerCase() === "k" && Math.abs(toCol - fromCol) === 2;

        if (isCastlingMove) {
          // Handle simulated castling for check filter
          if (toCol === fromCol + 2) {
            // Kingside
            tempBoard[toRow][toCol] = pieceToMove; // Move king
            tempBoard[fromRow][fromCol] = null;
            tempBoard[toRow][5] = currentBoard[fromRow][7]; // Move rook
            tempBoard[fromRow][7] = null;
          } else if (toCol === fromCol - 2) {
            // Queenside
            tempBoard[toRow][toCol] = pieceToMove; // Move king
            tempBoard[fromRow][fromCol] = null;
            tempBoard[toRow][3] = currentBoard[fromRow][0]; // Move rook
            tempBoard[fromRow][0] = null;
          }
        } else {
          // Regular move simulation
          tempBoard[toRow][toCol] = pieceToMove;
          tempBoard[fromRow][fromCol] = null;
        }

        // Find the king's position after the simulated move
        const kingPos = findKing(tempBoard, currentPlayerColor);

        // If the king is not found (error or test setup), assume invalid move
        if (!kingPos) continue;

        // Check if the king is attacked on the temporary board
        if (
          !isSquareAttacked(
            tempBoard,
            kingPos[0],
            kingPos[1],
            currentPlayerColor === "white" ? "black" : "white"
          )
        ) {
          legalFilteredMoves.push([toRow, toCol]);
        }
      }
      return legalFilteredMoves;
    },
    [findKing, isSquareAttacked]
  );

  /**
   * Checks if the current player's king is in check.
   * @param {Array<Array<string|null>>} currentBoard - The board state.
   * @param {string} playerColor - The color of the player to check ('white' or 'black').
   * @returns {boolean} True if the player's king is in check, false otherwise.
   */
  const isKingInCheck = useCallback(
    (currentBoard, playerColor) => {
      const kingPos = findKing(currentBoard, playerColor);
      if (!kingPos) return false; // King not on board, usually means game over
      return isSquareAttacked(
        currentBoard,
        kingPos[0],
        kingPos[1],
        playerColor === "white" ? "black" : "white"
      );
    },
    [findKing, isSquareAttacked]
  );

  /**
   * Checks if the game is over (checkmate or stalemate).
   * @param {Array<Array<string|null>>} currentBoard - The board state.
   * @param {string} currentPlayerColor - The color of the player whose turn it is.
   * @returns {string|null} 'checkmate', 'stalemate', or null if game is ongoing.
   */
  const checkGameEnd = useCallback(
    (currentBoard, currentPlayerColor) => {
      let hasLegalMoves = false;
      // Iterate through all pieces of the current player
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = currentBoard[r][c];
          if (piece && getPieceColor(piece) === currentPlayerColor) {
            const theoreticalMoves = calculateTheoreticalMoves(
              currentBoard,
              r,
              c
            );
            const filteredMoves = getLegalMovesAfterCheckFilter(
              currentBoard,
              r,
              c,
              theoreticalMoves,
              currentPlayerColor
            );
            if (filteredMoves.length > 0) {
              hasLegalMoves = true;
              break; // Found at least one legal move, not checkmate/stalemate
            }
          }
        }
        if (hasLegalMoves) break;
      }

      if (isKingInCheck(currentBoard, currentPlayerColor)) {
        if (!hasLegalMoves) {
          return "checkmate";
        }
      } else {
        if (!hasLegalMoves) {
          return "stalemate";
        }
      }
      return null; // Game ongoing
    },
    [
      getPieceColor,
      calculateTheoreticalMoves,
      getLegalMovesAfterCheckFilter,
      isKingInCheck,
    ]
  );

  /**
   * Handles a click on a chessboard square.
   * @param {number} row - The row index of the clicked square.
   * @param {number} col - The column index of the clicked square.
   */
  const handleSquareClick = useCallback(
    (row, col) => {
      if (gameOver) {
        setMessage("Game over! Please reset to play again.");
        return;
      }

      const piece = board[row][col];
      const pieceColor = getPieceColor(piece);

      // If no piece is selected yet
      if (selectedPiece === null) {
        // If the clicked square has a piece and it's the correct turn, select it
        if (piece && pieceColor === turn) {
          setSelectedPiece([row, col]);
          const theoreticalMoves = calculateTheoreticalMoves(board, row, col);
          const filteredLegalMoves = getLegalMovesAfterCheckFilter(
            board,
            row,
            col,
            theoreticalMoves,
            turn
          );
          setLegalMoves(filteredLegalMoves);
          setMessage(
            `Selected ${turn}'s ${pieceSymbols[piece]} at ${String.fromCharCode(
              97 + col
            )}${8 - row}.`
          );
        } else if (piece && pieceColor !== turn) {
          setMessage(
            `It's ${turn}'s turn. You clicked on a ${pieceColor} piece.`
          );
        } else {
          setMessage("No piece selected. Click on a piece to move.");
        }
      } else {
        // A piece is already selected
        const [selectedRow, selectedCol] = selectedPiece;
        const pieceAtSelected = board[selectedRow][selectedCol];

        // If the clicked square is the same as the selected piece, deselect it
        if (selectedRow === row && selectedCol === col) {
          setSelectedPiece(null);
          setLegalMoves([]); // Clear legal moves
          setMessage("Piece deselected.");
        } else if (piece && pieceColor === turn) {
          // If the clicked square has a piece of the same color as the selected piece, reselect it
          setSelectedPiece([row, col]);
          const theoreticalMoves = calculateTheoreticalMoves(board, row, col);
          const filteredLegalMoves = getLegalMovesAfterCheckFilter(
            board,
            row,
            col,
            theoreticalMoves,
            turn
          );
          setLegalMoves(filteredLegalMoves);
          setMessage(
            `Reselected ${turn}'s ${
              pieceSymbols[piece]
            } at ${String.fromCharCode(97 + col)}${8 - row}.`
          );
        } else {
          // Attempt to move the selected piece to the clicked square
          // Check if the target square is a legal move (filtered for check)
          const isTargetLegal = legalMoves.some(
            (move) => move[0] === row && move[1] === col
          );

          if (isTargetLegal) {
            const newBoard = board.map((arr) => [...arr]); // Create a deep copy of the board

            const isCastlingAttempt =
              pieceAtSelected.toLowerCase() === "k" &&
              Math.abs(col - selectedCol) === 2;

            if (isCastlingAttempt) {
              // Castling: Move King and Rook
              if (col === selectedCol + 2) {
                // Kingside Castling
                newBoard[row][col] = pieceAtSelected; // Move King
                newBoard[selectedRow][selectedCol] = null;
                newBoard[row][col - 1] = newBoard[row][7]; // Move Rook to F file
                newBoard[row][7] = null;
                setHasRookMoved((prev) => ({
                  ...prev,
                  [turn]: { ...prev[turn], kingside: true },
                }));
              } else if (col === selectedCol - 2) {
                // Queenside Castling
                newBoard[row][col] = pieceAtSelected; // Move King
                newBoard[selectedRow][selectedCol] = null;
                newBoard[row][col + 1] = newBoard[row][0]; // Move Rook to D file
                newBoard[row][0] = null;
                setHasRookMoved((prev) => ({
                  ...prev,
                  [turn]: { ...prev[turn], queenside: true },
                }));
              }
              setHasKingMoved((prev) => ({ ...prev, [turn]: true }));
            } else {
              // Regular move
              newBoard[row][col] = pieceAtSelected;
              newBoard[selectedRow][selectedCol] = null;

              // Update hasKingMoved/hasRookMoved for regular moves
              if (pieceAtSelected.toLowerCase() === "k") {
                setHasKingMoved((prev) => ({ ...prev, [turn]: true }));
              } else if (pieceAtSelected.toLowerCase() === "r") {
                if (
                  selectedRow === (turn === "white" ? 7 : 0) &&
                  selectedCol === 0
                ) {
                  // Queenside Rook
                  setHasRookMoved((prev) => ({
                    ...prev,
                    [turn]: { ...prev[turn], queenside: true },
                  }));
                } else if (
                  selectedRow === (turn === "white" ? 7 : 0) &&
                  selectedCol === 7
                ) {
                  // Kingside Rook
                  setHasRookMoved((prev) => ({
                    ...prev,
                    [turn]: { ...prev[turn], kingside: true },
                  }));
                }
              }
            }

            setBoard(newBoard);
            setSelectedPiece(null); // Deselect the piece after move
            setLegalMoves([]); // Clear legal moves after move

            const nextTurn = turn === "white" ? "black" : "white";
            const gameEndStatus = checkGameEnd(newBoard, nextTurn);

            if (gameEndStatus === "checkmate") {
              setGameOver(true);
              setMessage(`Checkmate! ${turn.toUpperCase()} wins!`);
            } else if (gameEndStatus === "stalemate") {
              setGameOver(true);
              setMessage(`Stalemate! Game is a draw.`);
            } else {
              // Check if the next player is in check (after the move)
              if (isKingInCheck(newBoard, nextTurn)) {
                setMessage(
                  `${turn}'s ${
                    pieceSymbols[pieceAtSelected]
                  } moved to ${String.fromCharCode(97 + col)}${
                    8 - row
                  }. ${nextTurn.toUpperCase()}'s King is in CHECK!`
                );
                setIsInCheck(true);
              } else {
                setMessage(
                  `${turn}'s ${
                    pieceSymbols[pieceAtSelected]
                  } moved to ${String.fromCharCode(97 + col)}${8 - row}.`
                );
                setIsInCheck(false);
              }
              setTurn(nextTurn); // Switch turn
            }
          } else {
            setMessage(
              `Invalid move for ${turn}'s ${pieceSymbols[pieceAtSelected]}. This move would leave your king in check or is not a legal move.`
            );
          }
        }
      }
    },
    [
      board,
      selectedPiece,
      turn,
      gameOver,
      getPieceColor,
      pieceSymbols,
      legalMoves,
      calculateTheoreticalMoves,
      getLegalMovesAfterCheckFilter,
      checkGameEnd,
      isKingInCheck,
      hasKingMoved,
      hasRookMoved,
      setHasKingMoved,
      setHasRookMoved,
    ]
  );

  /**
   * Renders a single square of the chessboard.
   * @param {number} row - The row index.
   * @param {number} col - The column index.
   * @returns {JSX.Element} The rendered square.
   */
  const renderSquare = useCallback(
    (row, col) => {
      const piece = board[row][col];
      const isLightSquare = (row + col) % 2 === 0;
      const squareColorClass = isLightSquare ? "bg-[#ebecd0]" : "bg-gray-700";
      const pieceColor = getPieceColor(piece);
      const pieceColorClass =
        pieceColor === "white" ? "text-white" : "text-black";
      const isSelected =
        selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col;
      const isLegalMoveTarget = legalMoves.some(
        (move) => move[0] === row && move[1] === col
      );

      const selectedClass = isSelected
        ? "ring-4 ring-blue-500 ring-offset-1"
        : ""; // Highlight selected square
      const pieceOutlineClass =
        pieceColor === "white" ? "piece-outline-black" : "piece-outline-white";
      const legalMoveClass = isLegalMoveTarget
        ? piece
          ? "ring-4 ring-red-500 ring-offset-1"
          : "bg-green-500/50" // Red for capture, green for empty
        : "";

      const kingPos = findKing(board, turn);
      const isKingSquare = kingPos && kingPos[0] === row && kingPos[1] === col;
      const checkHighlightClass =
        isInCheck && isKingSquare ? "bg-red-500/70" : ""; // Highlight king in check

      // Label color based on square color for contrast
      const labelColorClass = isLightSquare
        ? "text-gray-700/80"
        : "text-gray-300/80";

      return (
        <div
          key={`${row}-${col}`}
          className={`relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20
                            font-bold text-3xl md:text-4xl lg:text-5xl cursor-pointer select-none
                            ${squareColorClass} ${selectedClass} ${legalMoveClass} ${checkHighlightClass}
                            rounded-md transition-all duration-150 ease-in-out
                            ${isLightSquare ? "text-gray-800" : "text-white"}`} // Default text color for square coordinates/pieces
          onClick={() => handleSquareClick(row, col)}
          role="button"
          aria-label={`Square ${String.fromCharCode(97 + col)}${8 - row}`}
        >
          {/* Rank and File Labels */}
          {col === 0 && (
            <span
              className={`absolute top-0.5 left-1 text-xs md:text-sm font-bold select-none ${labelColorClass}`}
            >
              {8 - row}
            </span>
          )}
          {row === 7 && (
            <span
              className={`absolute bottom-0.5 right-1 text-xs md:text-sm font-bold select-none ${labelColorClass}`}
            >
              {String.fromCharCode(97 + col)}
            </span>
          )}

          {/* Render the piece if it exists */}
          {piece && (
            <span
              className={`${pieceColorClass} ${pieceOutlineClass} drop-shadow-md`}
            >
              {pieceSymbols[piece]}
            </span>
          )}
          {/* Optional: Add a small dot for empty legal move squares */}
          {!piece && isLegalMoveTarget && (
            <div className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full bg-green-700 opacity-75"></div>
          )}
        </div>
      );
    },
    [
      board,
      selectedPiece,
      handleSquareClick,
      getPieceColor,
      pieceSymbols,
      legalMoves,
      isInCheck,
      turn,
      findKing,
    ]
  );

  /**
   * Renders the entire chessboard.
   * @returns {JSX.Element} The rendered chessboard.
   */
  const renderBoard = useCallback(() => {
    return (
      <div className="grid grid-cols-8 gap-0 p-2 md:p-4 bg-gray-800 shadow-xl rounded-lg">
        {board.map((row, rowIndex) =>
          row.map((_, colIndex) => renderSquare(rowIndex, colIndex))
        )}
      </div>
    );
  }, [board, renderSquare]);

  // Initial message on load
  useEffect(() => {
    setMessage("Welcome to React Chess! White's turn.");
  }, []);

  const resetGame = useCallback(() => {
    setBoard(initialBoard);
    setSelectedPiece(null);
    setTurn("white");
    setMessage("Game reset! White's turn.");
    setLegalMoves([]);
    setGameOver(false);
    setIsInCheck(false);
    setHasKingMoved({ white: false, black: false });
    setHasRookMoved({
      white: { kingside: false, queenside: false },
      black: { kingside: false, queenside: false },
    });
  }, [initialBoard]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 text-center tracking-tight">
        React Chess Game
      </h1>
      <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg mb-6 text-center text-lg md:text-xl">
        <p>{message}</p>
      </div>
      {renderBoard()}
      <div className="mt-8 text-white text-center text-lg md:text-xl font-semibold">
        Current Turn:{" "}
        <span
          className={`font-bold ${
            turn === "white"
              ? "text-white bg-blue-600 px-3 py-1 rounded-full shadow-md"
              : "text-gray-900 bg-gray-300 px-3 py-1 rounded-full shadow-md"
          }`}
        >
          {turn.toUpperCase()}
        </span>
        {isInCheck && <span className="ml-4 text-red-400"> (IN CHECK!)</span>}
      </div>
      <button
        onClick={resetGame}
        className="mt-6 px-6 py-3 bg-purple-600 text-white font-bold rounded-full shadow-lg hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-75"
      >
        Reset Game
      </button>
      <p className="text-gray-400 mt-4 text-sm text-center max-w-lg">
        Click a piece to select it, then click another square to move it.
        Squares highlighted in green indicate legal moves for empty squares.
        Squares with a red ring indicate legal capture targets.
      </p>
      <p className="text-red-300 mt-2 text-xs text-center max-w-lg">
        Note: This version now includes:
        <ul>
          <li>Basic legal move validation for pieces</li>
          <li>Detection of king in check</li>
          <li>Prevention of moves that leave own king in check</li>
          <li>Basic Checkmate and Stalemate detection</li>
          <li>**Castling (Kingside and Queenside) rules and execution**</li>
        </ul>
        Still NOT included:
        <ul>
          <li>Special pawn moves (En Passant, Promotion)</li>
          <li>Three-fold repetition or fifty-move rule</li>
        </ul>
        These advanced rules are complex and would require further development.
      </p>
    </div>
  );
};

export default App;
