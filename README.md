# Filter Lines

Fork from <https://github.com/earshinov/vscode-filter-lines>

- Removed `with String`, `Exclude Lines`, `Context`, `search_type`

- Added `Matched`, `Matched Group`, `output_type`

This extension allows to you to filter lines of the current document by a string or a regular expression.
It is basically a port of [Filter Lines][filter lines (sublime text plugin)] package for Sublime Text.

![Demo](doc/demo.gif)

(the access log used for this illustration is borrowed [here](https://github.com/antlr/grammars-v4/blob/master/clf/examples/access_log))

## Available commands

All of the following commands are available via Ctrl-Shift-P.

| Command                                              | Default keybinding |
| ---------------------------------------------------- | ------------------ |
| Filter Lines: Include Lines with Regex Matched       | Ctrl-K Ctrl-R \*   |
| Filter Lines: Include Lines with Regex Matched Group | Ctrl-K Ctrl-G \*   |
| Filter Lines: Include Lines with Regex               |                    |

\* Use <kbd>cmd</kbd> instead of <kbd>ctrl</kbd> on Mac

"Regex" commands accept any regular expression valid in JavaScript, except that you cannot really match multiple lines.
See [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) for syntax reference, but
keep in mind that you only need to enter the _inner_ part of the regex without the enclosing slashes (`/.../`)
which one would normally use in JavaScript.

## Available settings

| Setting                    | Description                                                                                      | Default value |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ------------- |
| `caseSensitiveRegexSearch` | Makes searching by regex case sensitive.                                                         | `true`        |
| `preserveSearch`           | Tells the extension to preserve the search string.                                               | `true`        |
| `lineNumbers`              | Includes line numbers in filtered output. Line numbers are 0-based and padded to 5 spaces.       | `false`       |
| `createNewTab`             | Set this setting to `false` to have filtered output displayed in-place rather than in a new tab. | `true`        |

If you are using Settings UI, you will find these settings under "Filter Lines" section.

## Under the hood: Available commands ids

You can use these command ids to make your own keybindings.

### # `filterlines.includeLinesWithRegexMatched`

Implements the "Filter Lines: Include Lines with Regex" command with output of only matched. Takes no arguments.

### # `filterlines.includeLinesWithRegexMatchedGroup`

Implements the "Filter Lines: Include Lines with Regex" command with output of only matched group(s). Takes no arguments.

### # `filterlines.includeLinesWithRegex`

Implements the "Filter Lines: Include Lines with Regex" command. Takes no arguments.

| Argument        | Possible values                      | Default value | Description                                                                                                                           |
| --------------- | ------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `output_type`   | `"matched"` or `"group"` or `"line"` | `"matched"`   | Defines the output type.                                                                                                              |
| `invert_search` | `true` or `false`                    | `false`       | Defines the action type. By default the "Include" action is performed. Set `invert_search` to `true` to perform the "Exclude" action. |

### # `filterLines.filterLines`

Performs the action specified in the arguments with the given search string. Arguments:

| Argument        | Possible values         | Default value | Description                                                                                                                           |
| --------------- | ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `search_type`   | `"regex"` or `"string"` | `"regex"`     | Defines the search type.                                                                                                              |
| `invert_search` | `true` or `false`       | `false`       | Defines the action type. By default the "Include" action is performed. Set `invert_search` to `true` to perform the "Exclude" action. |
| `needle`        | any string              | `""`          | Defines the search string, as in the "needle in a haystack" idiom.                                                                    |

## Differences from the original Filter Lines

1. Folding is not supported due not VS Code API limitations.
2. Menu items are not provided, again due to VS Code API limitations.
3. With `"preserve_search": true` the search string is stored in memory rather than on disk and is cleared as soon as the VS Code window is closed.
4. With `"line_numbers": true` line numbers are appended even when the search is inverted (that is when an "Exclude…" command is used rather than an "Include…" one).

You can find this extension both in the [Visual Studio Marketplace][] and in the [Open VSX Registry][]. Happy filtering!

[filter lines (sublime text plugin)]: https://packagecontrol.io/packages/Filter%20Lines
[visual studio marketplace]: https://marketplace.visualstudio.com/
[open vsx registry]: https://open-vsx.org/
