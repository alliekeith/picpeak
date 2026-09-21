/*
 * App-level shared components.
 *
 * Button, Input and Card used to be re-exported from here as PicPeak's own
 * design-system layer. They are gone: the stock shadcn equivalents are
 * imported directly from @/components/ui/* at each call site. What is left
 * below is PicPeak-specific and has no shadcn counterpart.
 */
export { CMSContentBlock } from './CMSContentBlock';
export { CountrySelect } from './CountrySelect';
export { LocalizedDateInput } from './LocalizedDateInput';
export { TimeField, parseTimeToHHMM } from './TimeField';
export { SortableHeader, useColumnSort } from './SortableHeader';
export type { SortDir, SortPair, SortColumnMap } from './SortableHeader';
export { Loading, LoadingSkeleton } from './Loading';
export { ErrorBoundary, PageErrorBoundary } from './ErrorBoundary';
export { 
  Skeleton, 
  SkeletonGroup, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonGalleryGrid, 
  SkeletonList 
} from './Skeleton';
export { OfflineIndicator, useOnlineStatus } from './OfflineIndicator';
export { SkipLink } from './SkipLink';
export { DynamicFavicon } from './DynamicFavicon';
export { RobotsMetaTags } from './RobotsMetaTags';
export { LanguageSelector, SUPPORTED_LANGUAGES } from './LanguageSelector';
export { AuthenticatedImage } from './AuthenticatedImage';
export { AuthenticatedVideo } from './AuthenticatedVideo';
export { ProtectedImage } from './ProtectedImage';
export { ProtectionWarning } from './ProtectionWarning';
export { ReCaptcha } from './ReCaptcha';
export { PasswordGenerator } from './PasswordGenerator';
export { MarkdownContent } from './MarkdownContent';
export { PoweredBy } from './PoweredBy';
export { ConfirmDialogProvider, useConfirm, type ConfirmOptions, type ConfirmVariant } from './ConfirmDialog';
