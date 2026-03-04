import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { highlightCode } from '../highlight.js';

const VISIBLE_LINES = 30;

interface Props {
  type: 'file' | 'diff';
  path: string;
  content?: string;
  oldText?: string;
  newText?: string;
  isFocused: boolean;
  onClose: () => void;
  onSave?: (newContent: string) => void;
}

export function SidePanel({ type, path, content: initialContent, oldText, newText, isFocused, onClose, onSave }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<string[] | null>(null);
  
  const [scrollOffset, setScrollOffset] = useState(0);
  const [cursor, setCursor] = useState({ line: 0, char: 0 });
  const [isEditing, setIsEditing] = useState(false);
  
  const [filter, setFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize lines
  useEffect(() => {
    const raw = initialContent ?? '';
    const l = raw.split('\n');
    setLines(l);
    setCursor({ line: 0, char: 0 });
    setScrollOffset(0);
  }, [initialContent, path]);

  // Debounced highlighting
  useEffect(() => {
    if (type !== 'file') return;
    const timeout = setTimeout(() => {
      const ext = path.split('.').pop() || 'txt';
      highlightCode(lines.join('\n'), ext).then(res => {
        setHighlighted(res.split('\n'));
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [lines, path, type]);

  // Index words for autocomplete
  const wordIndex = useMemo(() => {
    const words = new Set<string>();
    lines.forEach(line => {
      line.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g)?.forEach(w => {
        if (w.length > 3) words.add(w);
      });
    });
    return Array.from(words);
  }, [lines]);

  // Logic to find completion
  const updateSuggestions = (line: string, char: number) => {
    const textBefore = line.slice(0, char);
    const match = textBefore.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (match) {
      const prefix = match[1].toLowerCase();
      const filtered = wordIndex.filter(w => w.toLowerCase().startsWith(prefix) && w.toLowerCase() !== prefix);
      setSuggestions(filtered.slice(0, 5));
      setSuggestionIdx(0);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  useInput((input, key) => {
    if (!isFocused) return;

    // View Mode Handling
    if (!isEditing && !isSearching) {
      if (key.escape) { onClose(); return; }
      if (input === 'i') { setIsEditing(true); return; }
      if (input === '/') { setIsSearching(true); return; }
      if (key.upArrow) setScrollOffset(s => Math.max(0, s - 1));
      if (key.downArrow) setScrollOffset(s => Math.min(lines.length - 1, s + 1));
      if (key.pageUp) setScrollOffset(s => Math.max(0, s - VISIBLE_LINES));
      if (key.pageDown) setScrollOffset(s => Math.min(lines.length - 1, s + VISIBLE_LINES));
      if (input === 'g') setScrollOffset(0);
      if (input === 'G') setScrollOffset(Math.max(0, lines.length - VISIBLE_LINES));
      return;
    }

    // Search Mode Handling
    if (isSearching) {
      if (key.escape || key.return) { setIsSearching(false); return; }
      if (key.backspace || key.delete) { setFilter(f => f.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta) { setFilter(f => f + input); return; }
      return;
    }

    // Edit Mode Handling
    if (isEditing) {
      if (key.escape) { 
        setIsEditing(false); 
        setShowSuggestions(false);
        return; 
      }

      // Save
      if (key.ctrl && input === 's') {
        onSave?.(lines.join('\n'));
        return;
      }

      // Autocomplete selection
      if (showSuggestions && key.tab) {
        const sel = suggestions[suggestionIdx];
        const line = lines[cursor.line];
        const textBefore = line.slice(0, cursor.char);
        const prefixMatch = textBefore.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (prefixMatch) {
          const prefix = prefixMatch[1];
          const suffix = line.slice(cursor.char);
          const newLine = textBefore.slice(0, -prefix.length) + sel + suffix;
          const newLines = [...lines];
          newLines[cursor.line] = newLine;
          setLines(newLines);
          setCursor({ ...cursor, char: textBefore.length - prefix.length + sel.length });
          setShowSuggestions(false);
        }
        return;
      }

      // Navigation in Edit Mode
      if (key.upArrow) {
        const newLine = Math.max(0, cursor.line - 1);
        setCursor({ line: newLine, char: Math.min(cursor.char, lines[newLine]?.length || 0) });
        if (newLine < scrollOffset) setScrollOffset(newLine);
        return;
      }
      if (key.downArrow) {
        const newLine = Math.min(lines.length - 1, cursor.line + 1);
        setCursor({ line: newLine, char: Math.min(cursor.char, lines[newLine]?.length || 0) });
        if (newLine >= scrollOffset + VISIBLE_LINES) setScrollOffset(newLine - VISIBLE_LINES + 1);
        return;
      }
      if (key.leftArrow) {
        setCursor(c => ({ ...c, char: Math.max(0, c.char - 1) }));
        return;
      }
      if (key.rightArrow) {
        setCursor(c => ({ ...c, char: Math.min(lines[c.line].length, c.char + 1) }));
        return;
      }

      // Deletion
      if (key.backspace || key.delete) {
        const currentLine = lines[cursor.line];
        if (cursor.char > 0) {
          const newLines = [...lines];
          newLines[cursor.line] = currentLine.slice(0, cursor.char - 1) + currentLine.slice(cursor.char);
          setLines(newLines);
          setCursor(c => ({ ...c, char: c.char - 1 }));
          updateSuggestions(newLines[cursor.line], cursor.char - 1);
        } else if (cursor.line > 0) {
          const prevLine = lines[cursor.line - 1];
          const newLines = [...lines];
          newLines.splice(cursor.line - 1, 2, prevLine + currentLine);
          setLines(newLines);
          setCursor({ line: cursor.line - 1, char: prevLine.length });
          if (cursor.line - 1 < scrollOffset) setScrollOffset(cursor.line - 1);
        }
        return;
      }

      // Newline
      if (key.return) {
        const currentLine = lines[cursor.line];
        const newLines = [...lines];
        newLines[cursor.line] = currentLine.slice(0, cursor.char);
        newLines.splice(cursor.line + 1, 0, currentLine.slice(cursor.char));
        setLines(newLines);
        setCursor({ line: cursor.line + 1, char: 0 });
        setShowSuggestions(false);
        if (cursor.line + 1 >= scrollOffset + VISIBLE_LINES) setScrollOffset(cursor.line + 1 - VISIBLE_LINES + 1);
        return;
      }

      // Typing
      if (input && !key.ctrl && !key.meta) {
        const currentLine = lines[cursor.line];
        const newLines = [...lines];
        newLines[cursor.line] = currentLine.slice(0, cursor.char) + input + currentLine.slice(cursor.char);
        setLines(newLines);
        setCursor(c => ({ ...c, char: c.char + input.length }));
        updateSuggestions(newLines[cursor.line], cursor.char + input.length);
      }
    }
  });

  const visibleLines = (isEditing || highlighted === null ? lines : highlighted).slice(scrollOffset, scrollOffset + VISIBLE_LINES);
  const fileName = path.split(/[\\/]/).pop() ?? path;

  return (
    <Box
      flexDirection="column"
      width="50%"
      borderStyle="double"
      borderColor={isFocused ? (isEditing ? "#FF00AA" : "#00E5FF") : "#484F58"}
      paddingX={1}
      marginLeft={1}
    >
      {/* Header */}
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color={isFocused ? (isEditing ? "#FF00AA" : "#00E5FF") : "#484F58"} bold> 
          {isEditing ? '⚡ NEURAL_EDITOR' : '🔍 NEURAL_READER'} 
        </Text>
      </Box>

      {/* Info */}
      <Box borderBottom borderStyle="single" borderColor="#484F58" marginBottom={0} paddingY={0} justifyContent="space-between">
        <Box>
          <Text color="white" bold> {fileName.toUpperCase()} </Text>
          <Text color="#484F58"> [{lines.length}L] </Text>
        </Box>
        <Box>
          <Text color={isEditing ? "#FF00AA" : "#00E5FF"} bold> {isEditing ? '[EDIT_MODE]' : '[VIEW_MODE]'} </Text>
        </Box>
      </Box>

      {/* Search/Filter Bar */}
      {(isSearching || filter) && (
        <Box paddingX={1} marginBottom={0} borderStyle="round" borderColor={isSearching ? "#FF00AA" : "#484F58"}>
          <Text color="#FF00AA" bold>FIND: </Text>
          <Text color="white">{filter}</Text>
          {isSearching && <Text color="#FF00AA" bold>▌</Text>}
        </Box>
      )}

      {/* Content Area */}
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {visibleLines.map((line, i) => {
          const lineIdx = scrollOffset + i;
          const isCursorLine = isEditing && lineIdx === cursor.line;
          const query = filter.toLowerCase();
          const isMatch = query && line.toLowerCase().includes(query);
          
          return (
            <Box key={lineIdx} backgroundColor={isMatch ? '#302000' : undefined}>
              <Text color={isCursorLine ? "#FF00AA" : "#484F58"}>{String(lineIdx + 1).padStart(4)} </Text>
              {isCursorLine ? (
                <Box>
                  <Text>{line.slice(0, cursor.char)}</Text>
                  <Text backgroundColor="#FF00AA" color="black">{line[cursor.char] || ' '}</Text>
                  <Text>{line.slice(cursor.char + 1)}</Text>
                </Box>
              ) : (
                <Text wrap="truncate">{line || ' '}</Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Autocomplete Overlay */}
      {showSuggestions && isEditing && (
        <Box
          position="absolute"
          marginTop={cursor.line - scrollOffset + 4}
          marginLeft={cursor.char + 6}
          flexDirection="column"
          backgroundColor="#161b22"
          borderStyle="single"
          borderColor="#00E5FF"
          paddingX={1}
        >
          {suggestions.map((s, idx) => (
            <Text key={s} color={idx === suggestionIdx ? "#FF00AA" : "white"}>
              {idx === suggestionIdx ? '❯ ' : '  '}{s}
            </Text>
          ))}
          <Box borderTop borderStyle="single" borderColor="#484F58" marginTop={0}>
            <Text color="#484F58" size="tiny">TAB:COMPLETE</Text>
          </Box>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1} borderTop borderStyle="single" borderColor="#484F58" paddingTop={0}>
        {isEditing ? (
          <Text color="#484F58"> ESC:VIEW  CTRL+S:SAVE  ↑↓←→:MOVE  ENTER:NEWLINE </Text>
        ) : (
          <Text color="#484F58"> ESC:CLOSE  i:EDIT  /:FIND  ↑↓:SCROLL </Text>
        )}
      </Box>
    </Box>
  );
}
