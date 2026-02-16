/**
 * Flowbite Icons - Wrappers around Heroicons
 * Provides a consistent icon interface with size prop across the app.
 */
import React from "react";
import * as Outline from "@heroicons/react/24/outline";
import * as Solid from "@heroicons/react/24/solid";

type IconProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

type WrappedIconProps = IconProps & React.SVGProps<SVGSVGElement>;

const sizeMap: Record<string, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

function wrap(Component: React.ComponentType<React.SVGProps<SVGSVGElement>>) {
  return function WrappedIcon({
    className,
    size = "md",
    ...rest
  }: WrappedIconProps) {
    const sizeClass = sizeMap[size] || sizeMap.md;
    const finalClass = className ? `${sizeClass} ${className}` : sizeClass;
    return <Component className={finalClass} {...rest} />;
  };
}

// --- Outline Icons ---
export const IconBook = wrap(Outline.BookOpenIcon);
export const IconDocument = wrap(Outline.DocumentIcon);
export const IconChartBar = wrap(Outline.ChartBarIcon);
export const IconLink = wrap(Outline.LinkIcon);
export const IconUsers = wrap(Outline.UsersIcon);
export const IconSettings = wrap(Outline.Cog6ToothIcon);
export const IconSearch = wrap(Outline.MagnifyingGlassIcon);
export const IconPlus = wrap(Outline.PlusIcon);
export const IconCheck = wrap(Outline.CheckIcon);
export const IconClose = wrap(Outline.XMarkIcon);
export const IconTrash = wrap(Outline.TrashIcon);
export const IconArrowLeft = wrap(Outline.ArrowLeftIcon);
export const IconRefresh = wrap(Outline.ArrowPathIcon);
export const IconDownload = wrap(Outline.ArrowDownTrayIcon);
export const IconExternalLink = wrap(Outline.ArrowTopRightOnSquareIcon);
export const IconTranslate = wrap(Outline.LanguageIcon);
export const IconCalendar = wrap(Outline.CalendarIcon);
export const IconFilter = wrap(Outline.FunnelIcon);
export const IconList = wrap(Outline.ListBulletIcon);
export const IconClipboard = wrap(Outline.ClipboardDocumentListIcon);
export const IconPencil = wrap(Outline.PencilIcon);
export const IconQuestionMark = wrap(Outline.QuestionMarkCircleIcon);
export const IconStar = wrap(Outline.StarIcon);
export const IconTag = wrap(Outline.TagIcon);
export const IconArchive = wrap(Outline.ArchiveBoxIcon);
export const IconCheckCircle = wrap(Outline.CheckCircleIcon);
export const IconXCircle = wrap(Outline.XCircleIcon);
export const IconUndo = wrap(Outline.ArrowUturnLeftIcon);
export const IconPrinter = wrap(Outline.PrinterIcon);
export const IconDocumentText = wrap(Outline.DocumentTextIcon);
export const IconUserCircle = wrap(Outline.UserCircleIcon);
export const IconUser = wrap(Outline.UserIcon);
export const IconFolder = wrap(Outline.FolderIcon);
export const IconFolderOpen = wrap(Outline.FolderOpenIcon);
export const IconPhoto = wrap(Outline.PhotoIcon);
export const IconFilm = wrap(Outline.FilmIcon);
export const IconMusicalNote = wrap(Outline.MusicalNoteIcon);
export const IconDocumentPdf = wrap(Outline.DocumentTextIcon);
export const IconEye = wrap(Outline.EyeIcon);
export const IconUpload = wrap(Outline.ArrowUpTrayIcon);
export const IconInfoCircle = wrap(Outline.InformationCircleIcon);
export const IconLinkChain = wrap(Outline.LinkIcon);
export const IconGraph = wrap(Outline.PresentationChartLineIcon);
export const IconSparkles = wrap(Outline.SparklesIcon);
export const IconArrowsExpand = wrap(Outline.ArrowsPointingOutIcon);
export const IconPlay = wrap(Outline.PlayIcon);
export const IconStop = wrap(Outline.StopIcon);
export const IconAdjustments = wrap(Outline.AdjustmentsHorizontalIcon);
export const IconBolt = wrap(Outline.BoltIcon);
export const IconCircleStack = wrap(Outline.CircleStackIcon);
export const IconCheckBadge = wrap(Outline.CheckBadgeIcon);
export const IconShield = wrap(Outline.ShieldCheckIcon);
export const IconKey = wrap(Outline.KeyIcon);
export const IconLock = wrap(Outline.LockClosedIcon);
export const IconExclamation = wrap(Outline.ExclamationCircleIcon);
export const IconArrowRight = wrap(Outline.ArrowRightIcon);
export const IconGlobe = wrap(Outline.GlobeAltIcon);
export const IconClock = wrap(Outline.ClockIcon);
export const IconChevronRight = wrap(Outline.ChevronRightIcon);
export const IconSend = wrap(Outline.PaperAirplaneIcon);
export const IconTrendingUp = wrap(Outline.ArrowTrendingUpIcon);
export const IconChevronLeft = wrap(Outline.ChevronLeftIcon);
export const IconChevronDown = wrap(Outline.ChevronDownIcon);
export const IconChevronUp = wrap(Outline.ChevronUpIcon);
export const IconLogout = wrap(Outline.ArrowRightOnRectangleIcon);
export const IconShare = wrap(Outline.ShareIcon);
export const IconMinus = wrap(Outline.MinusIcon);
export const IconBeaker = wrap(Outline.BeakerIcon);
export const IconCube = wrap(Outline.CubeTransparentIcon);
export const IconArrowsContract = wrap(Outline.ArrowsPointingInIcon);
export const IconPause = wrap(Outline.PauseIcon);
export const IconViewfinder = wrap(Outline.ViewfinderCircleIcon);
export const IconBookOpen = wrap(Outline.BookOpenIcon);
export const IconChip = wrap(Outline.CpuChipIcon);
export const IconTableCells = wrap(Outline.TableCellsIcon);
export const IconCodeBracket = wrap(Outline.CodeBracketIcon);
export const IconBarsLeft = wrap(Outline.Bars3BottomLeftIcon);
export const IconBarsCenter = wrap(Outline.Bars3CenterLeftIcon);
export const IconBarsRight = wrap(Outline.Bars3BottomRightIcon);

// --- Solid Icons ---
export const IconCheckCircleFilled = wrap(Solid.CheckCircleIcon);
export const IconStarFilled = wrap(Solid.StarIcon);

// --- Alias Icons for UI convenience ---
export const IconArrowsCollapse = IconArrowsContract;
export const IconTarget = IconViewfinder;
export const IconChevronsRight = IconChevronRight;
export const IconPaintBrush = IconSparkles;
export const IconChatBubbleQuote = IconQuestionMark;
export const IconAlignTop = IconList;
export const IconAlignMiddle = IconList;
export const IconAlignBottom = IconList;
