# Filter Lines

Fork from <https://github.com/earshinov/vscode-filter-lines>

This extension allows you to filter lines of the current document by a regular expression and output matched or matched group(s) or entire line.

```javascript
// Example text
1a/
2b/
3c/
4d/

// Output of Include Matched: \d(\w)
1a
2b
3c
4d

// Output of Include Matched Group: \d(\w)
a
b
c
d

// Output of Include Line: \d(\w)
1a/
2b/
3c/
4d/
```

## Available commands

All of the following commands are available via Ctrl-Shift-P.

| Command                             | Default keybinding |
| ----------------------------------- | ------------------ |
| Filter Lines: Include Matched       | Ctrl-K Ctrl-R \*   |
| Filter Lines: Include Matched Group | Ctrl-K Ctrl-G \*   |
| Filter Lines: Include Line          |                    |

\* Use <kbd>cmd</kbd> instead of <kbd>ctrl</kbd> on Mac

"Regex" commands accept any regular expression valid in JavaScript, except that you cannot really match multiple lines.
See [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) for syntax reference, but
keep in mind that you only need to enter the _inner_ part of the regex without the enclosing slashes (`/.../`)
which one would normally use in JavaScript.

## Available settings

| Setting                    | Description                                                                                | Default value |
| -------------------------- | ------------------------------------------------------------------------------------------ | ------------- |
| `caseSensitiveRegexSearch` | Makes searching by regex case sensitive.                                                   | `true`        |
| `preserveSearch`           | Tells the extension to preserve the search string.                                         | `true`        |
| `lineNumbers`              | Includes line numbers in filtered output. Line numbers are 0-based and padded to 5 spaces. | `false`       |

If you are using Settings UI, you will find these settings under "Filter Lines" section.

## Under the hood: Available commands ids

You can use these command ids to make your own keybindings.

### # `filterlines.includeMatched`

Implements the "Filter Lines: Include Line" command with output of only matched. Takes no arguments.

### # `filterlines.includeMatchedGroup`

Implements the "Filter Lines: Include Line" command with output of only matched group(s). Takes no arguments.

### # `filterlines.includeLine`

Implements the "Filter Lines: Include Line" command. Takes no arguments.

| Argument        | Possible values                      | Default value | Description                                                                                                                           |
| --------------- | ------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `output_type`   | `"matched"` or `"group"` or `"line"` | `"matched"`   | Defines the output type.                                                                                                              |
| `invert_search` | `true` or `false`                    | `false`       | Defines the action type. By default the "Include" action is performed. Set `invert_search` to `true` to perform the "Exclude" action. |

### # `filterLines.filterLines`

Performs the action specified in the arguments with the given search string. Arguments:

| Argument        | Possible values                      | Default value | Description                                                                                                                           |
| --------------- | ------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `output_type`   | `"matched"` or `"group"` or `"line"` | `"matched"`   | Defines the output type.                                                                                                              |
| `invert_search` | `true` or `false`                    | `false`       | Defines the action type. By default the "Include" action is performed. Set `invert_search` to `true` to perform the "Exclude" action. |
| `needle`        | any string                           | `""`          | Defines the search string, as in the "needle in a haystack" idiom.                                                                    |

## Differences from the original Filter Lines

1. Menu items are not provided, due to VS Code API limitations.
1. With `"preserve_search": true` the search string is stored in memory rather than on disk and is cleared as soon as the VS Code window is closed.
1. With `"line_numbers": true` line numbers are appended even when the search is inverted.

You can find this extension both in the [Visual Studio Marketplace][]. Happy filtering!

[filter lines (sublime text plugin)]: https://packagecontrol.io/packages/Filter%20Lines
[visual studio marketplace]: https://marketplace.visualstudio.com/
