# components/common → stock shadcn/ui migration

One-time codemods that moved ~1,500 call sites off PicPeak's own Button,
Input, Card and Skeleton wrappers and onto the unmodified shadcn components
in `src/components/ui`.

They are kept as the record of a change too large to review line by line:
the transformation rules are here, and `run-all.sh` reproduces the entire
migration from the commit before it. They are not meant to be run again —
the wrapper components they read no longer exist.

    ./run-all.sh        # whole migration, in order

| script | what it does |
| --- | --- |
| `migrate-button.mjs` | variant/size renames; `isLoading` → `disabled` + a `Loader2` child; `leftIcon`/`rightIcon` → children |
| `migrate-button-dynamic.mjs` | the same value renames inside expressions such as `variant={active ? 'primary' : 'outline'}` |
| `migrate-card.mjs` | `padding` → shadcn's `Card`/`CardContent` composition |
| `migrate-input.mjs` | `label`/`error`/`helperText`/icons → real markup, keeping the `aria-describedby` contract |
| `migrate-skeleton.mjs` | `variant`/`animation`/`width`/`height` → classes and inline style |
| `confirm-dialog.py` | `ConfirmDialog` renders a stock `AlertDialog`; the `useConfirm()` API is unchanged |
| `skeleton-composites.py` | keeps the app's loading layouts, drops the local primitive |
| `common-barrel.py` | removes the three wrappers from the barrel |
| `update-tests.py` | retargets two tests that asserted the old implementation |

Written with ts-morph rather than regex: these are JSX structural edits, and
several of the rewrites (merging `disabled` with `isLoading`, hoisting icons
into children, wrapping card bodies) cannot be expressed safely as text
substitution. Every run was gated on `tsc`, `eslint`, `vitest` and a
production build.
