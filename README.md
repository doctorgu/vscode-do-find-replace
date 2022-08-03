# Find Replace

Fork from <https://github.com/earshinov/vscode-filter-lines>

This extension allows you

1. To filter text of the current document by a regular expression and output matched or matched group(s).
2. To replace text of the current document by a list of regular expression used find and replace and output.

```javascript
// Example text
1a/
2b/
3c/
4d/

// Output of Replace List: 1:11,2:22
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

```

## Available commands

All of the following commands are available via Ctrl-Shift-P.

| Command                             | Default keybinding |
| ----------------------------------- | ------------------ |
| Find Replace: Replace List          | Ctrl-K Ctrl-R \*   |
| Find Replace: Include Matched       | Ctrl-K Ctrl-M \*   |
| Find Replace: Include Matched Group | Ctrl-K Ctrl-G \*   |

\* Use <kbd>cmd</kbd> instead of <kbd>ctrl</kbd> on Mac

"Regex" commands accept any regular expression valid in JavaScript.
Use `m` flag if you want to match multiple lines.
See [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) for syntax reference, but
keep in mind that you need to prefix flag between `(?` and `)` like `(?gs)` and inner part of the regex without the enclosing slashes (`/.../`) like `(?gs)\d+`.

## Available settings

| Setting          | Description                                        | Default value |
| ---------------- | -------------------------------------------------- | ------------- |
| `preserveSearch` | Tells the extension to preserve the search string. | `true`        |

If you are using Settings UI, you will find these settings under "Find Replace" section.

## Under the hood: Available commands ids

You can use these command ids to make your own keybindings.

### # `findReplace.replaceList`

Implements the "Find Replace: Replace List" command with output of replaced.

Input value is combined with comma(,) and colon(:) when read from user input, but line delimeter when read from file.

For example `1:11,2:22` must be replaced to `1:11\n2:22` or `1:11\r\n2:22` when you enter file path in input box.

### # `findReplace.includeMatched`

Implements the "Find Replace: Include Line" command with output of only matched.

### # `findReplace.includeMatchedGroup`

Implements the "Find Replace: Include Line" command with output of only matched group(s).

You can find this extension both in the [Visual Studio Marketplace][]. Happy filtering!

[visual studio marketplace]: https://marketplace.visualstudio.com/
