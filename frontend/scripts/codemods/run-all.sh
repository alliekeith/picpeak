#!/usr/bin/env bash
# Full components/common -> stock shadcn migration, runnable from a clean tree.
# Order matters: imports are normalised first so the codemods can see every
# call site, then the codemods run, then the wrappers are removed.
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "1/5  normalising deep imports of the wrappers"
sed -i "s#import { Button } from '../common/Button';#import { Button } from '@/components/ui/button';#" \
  src/components/admin/UsageReportingPrompt.tsx
sed -i "s#import { Card } from './Card';#import { Card, CardContent } from '@/components/ui/card';#" \
  src/components/common/CMSContentBlock.tsx
sed -i "s#import { Button } from './Button';#import { Button } from '@/components/ui/button';#" \
  src/components/common/ErrorBoundary.tsx src/components/common/PasswordGenerator.tsx

echo "2/5  running codemods"
node scripts/codemods/migrate-button.mjs
node scripts/codemods/migrate-button-dynamic.mjs
node scripts/codemods/migrate-card.mjs
node scripts/codemods/migrate-input.mjs

echo "3/5  ConfirmDialog -> stock AlertDialog"
python3 scripts/codemods/confirm-dialog.py

echo "4/5  Skeleton composites -> stock Skeleton"
# Must run before migrate-skeleton: the composites only start importing the
# stock Skeleton here, and the codemod keys off that import.
python3 scripts/codemods/skeleton-composites.py
node scripts/codemods/migrate-skeleton.mjs

echo "5/5  removing the wrapper components"
rm -f src/components/common/Button.tsx src/components/common/Input.tsx src/components/common/Card.tsx
python3 scripts/codemods/common-barrel.py
# Two screens import Button from the barrel but have no Button props to
# rewrite, so the codemods leave them alone. Fixed last, after the barrel
# has dropped its Button export.
for f in src/features/settings/tabs/AccountingTab.tsx src/pages/admin/settings/CrmSettingsPage.tsx; do
  sed -i "s#import { Button, Loading } from '../../../components/common';#import { Loading } from '../../../components/common';\nimport { Button } from '@/components/ui/button';#" "$f"
done
echo "6/6  updating tests that assert the old implementation"
python3 scripts/codemods/update-tests.py

echo "done"
