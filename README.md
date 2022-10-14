# Find Replace

Fork from <https://github.com/earshinov/vscode-filter-lines>

This extension allows you

1. To filter text of the current document by a regular expression and output matched or matched group(s).
2. To replace text of the current document by a list of find and replace and output replaced text.

```javascript
// Example text
1a!
2b!
3c!
4d!

// Output of Replace List: 1:11,2:22
11a!
22b!
3c!
4d!

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
Use `s` (DOTALL) flag if you want to match multiple lines.
See [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) for syntax reference, but
keep in mind that you need to prefix flag between `(?` and `)` like `(?gs)` and inner part of the regex without the enclosing slashes (`/.../`) like `(?gs)\d+`.

## Flags

You can prefix flags between `(?` and `)` like `(?gis)`. If not prefixed default `gs` flags will be used.

### Following is RegExp flags

`g`(global): Don't return after first match

`m`(multi line): ^ and $ match start/end of line

`i`(insensitive): Case insensitive match

`y`(sticky): Anchor to start of pattern, or at the end of the most recent match

`u`(unicode): Match with full unicode

`s`(single line): Dot matches newline

`d`(indices): The regex engine returns match indices

### Following is extension specific flags

`p`(path): Read find and replace value from file path. Use `+` to specify multiple path like `common.txt+order.txt`

`c`(change): Change key and value. For example, `a:1` means replace `1` with `a`, but means replace `a` with `1` when `c` flag used.

`w`(word): Find word only by enclosing find value with `defaultBoundary` of setting to prevent replace again case. Target will change to value when `c` flag used.

## Available settings

| Setting           | Description                                                      | Default value |
| ----------------- | ---------------------------------------------------------------- | ------------- |
| `preserveSearch`  | Tells the extension to preserve the search string.               | `true`        |
| `defaultFlags`    | Tells the extension to preserve the default flags.               | `gm`          |
| `defaultBoundary` | Tells the extension to preserve the default word boundary flags. | `gm`          |

If you are using Settings UI, you will find these settings under "Find Replace" section.

## Under the hood: Available commands ids

You can use these command ids to make your own keybindings.

### # `findReplace.replaceList`

Implements the "Find Replace: Replace List" command with output of replaced.

Input value is combined with comma(,) and colon(:) when read from user input, but line delimeter when read from file.

For example `1:11,2:22` must be replaced to `1:11\n2:22` or `1:11\r\n2:22` when you enter file path in input box.

To escape `,` or `:`

1. Use doubled value like `,,` or `::`
2. Use `&comma;` or `&colon;`

File path rule

- Can use relative path (ex: `data/a.txt` to get `a.txt` in `data` folder inside current workspace folder)
- Can be combined with `+` (ex: `data/a.txt+data/b.txt` to get `a.txt` and `b.txt` in `data` folder)

### # `findReplace.includeMatched`

Implements the "Find Replace: Include Line" command with output of only matched.

### # `findReplace.includeMatchedGroup`

Implements the "Find Replace: Include Line" command with output of only matched group(s).

You can find this extension in the [Visual Studio Marketplace][].

[visual studio marketplace]: https://marketplace.visualstudio.com/
