# Changelog

## [1.1.3]

Added:
r flag for reverse order when replace list.

## [1.1.2]

Added:
p flag for isPath when replace list. + operator when p flag.
c flag for change key and value when replace list.

Removed:
Descending sort removed when replace list because it cannot solve all problem for replacing again.

## [1.1.1]

Changed:
Replace and filter target changed to whole text instead of each line.
So title changed to `DoFindReplace`.

Removed:
includeLine
caseSensitiveRegexSearch

## [1.1.0]

Added:
Reading from file path when replace.

## [1.0.2]

Added:
Default key binding for Filter Lines: Include Line (Ctrl-K Ctrl-L)
Filter applied selected text only when selected.
Replace lines with list of search and replace.

Changed:
Default key binding for Filter Lines: Include Matched (Ctrl-K Ctrl-R) to (Ctrl-K Ctrl-M)

Removed:
Search key by section
Invert search

## [1.0.1]

Removed:
createNewTab

## [1.0.0]

Fork from https://github.com/earshinov/vscode-filter-lines

Removed:
with String, Exclude Lines, Context, search_type

Added:
Matched, Matched Group, output_type
