# Filter Lines

Fork from <https://github.com/earshinov/vscode-filter-lines>

This extension allows you to filter lines of the current document by a regular expression and output matched or matched group(s) or entire line.

```javascript
// Example text
1a/
2b/
3c/
4d/

// Output of Replace List: {"1":"11","2":"22"}
11a
22b
3c
4d

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
| Filter Lines: Replace List          | Ctrl-K Ctrl-R \*   |
| Filter Lines: Include Matched       | Ctrl-K Ctrl-M \*   |
| Filter Lines: Include Matched Group | Ctrl-K Ctrl-G \*   |
| Filter Lines: Include Line          | Ctrl-K Ctrl-L \*   |

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

### # `filterlines.replaceList`

Implements the "Filter Lines: Replace List" command with output of replaced. Takes no arguments.

### # `filterlines.includeMatched`

Implements the "Filter Lines: Include Line" command with output of only matched. Takes no arguments.

### # `filterlines.includeMatchedGroup`

Implements the "Filter Lines: Include Line" command with output of only matched group(s). Takes no arguments.

### # `filterlines.includeLine`

Implements the "Filter Lines: Include Line" command. Takes no arguments.

You can find this extension both in the [Visual Studio Marketplace][]. Happy filtering!

[visual studio marketplace]: https://marketplace.visualstudio.com/
