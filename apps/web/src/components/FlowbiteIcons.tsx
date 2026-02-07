/**
 * Flowbite Icons - Wrappers around flowbite-react-icons/outline
 * Provides a consistent icon interface with size prop across the app.
 *
 * Usage:
 *   import { IconFolder, IconClose } from "./FlowbiteIcons";
 *   <IconFolder size="sm" />     // w-4 h-4
 *   <IconFolder size="md" />     // w-5 h-5 (default)
 *   <IconFolder size="lg" />     // w-6 h-6
 *   <IconFolder className="w-8 h-8" />  // custom size
 */
import React from "react";
import * as Outline from "flowbite-react-icons/outline";
import * as Solid from "flowbite-react-icons/solid";

type IconProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
};

const sizeMap: Record<string, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

function wrap(Component: React.ComponentType<any>) {
  return function WrappedIcon({
    className,
    size = "md",
    style,
    ...rest
  }: IconProps) {
    const sizeClass = sizeMap[size] || sizeMap.md;
    const finalClass = className ? `${sizeClass} ${className}` : sizeClass;
    return <Component className={finalClass} style={style} {...rest} />;
  };
}

// --- Outline Icons ---
export const IconBook = wrap(Outline.BookOpen);
export const IconDocument = wrap(Outline.FileLines);
export const IconChartBar = wrap(Outline.Chart);
export const IconLink = wrap(Outline.Link);
export const IconUsers = wrap(Outline.UsersGroup);
export const IconSettings = wrap(Outline.Cog);
export const IconSearch = wrap(Outline.Search);
export const IconPlus = wrap(Outline.Plus);
export const IconCheck = wrap(Outline.Check);
export const IconClose = wrap(Outline.Close);
export const IconTrash = wrap(Outline.TrashBin);
export const IconArrowLeft = wrap(Outline.ArrowLeft);
export const IconRefresh = wrap(Outline.Refresh);
export const IconDownload = wrap(Outline.Download);
export const IconExternalLink = wrap(Outline.ArrowUpRightFromSquare);
export const IconTranslate = wrap(Outline.Language);
export const IconCalendar = wrap(Outline.CalendarMonth);
export const IconFilter = wrap(Outline.Filter);
export const IconList = wrap(Outline.List);
export const IconClipboard = wrap(Outline.ClipboardList);
export const IconPencil = wrap(Outline.Pen);
export const IconQuestionMark = wrap(Outline.QuestionCircle);
export const IconStar = wrap(Outline.Star);
export const IconTag = wrap(Outline.Tag);
export const IconArchive = wrap(Outline.Archive);
export const IconCheckCircle = wrap(Outline.CheckCircle);
export const IconXCircle = wrap(Outline.CloseCircle);
export const IconUndo = wrap(Outline.Undo);
export const IconPrinter = wrap(Outline.Printer);
export const IconDocumentText = wrap(Outline.File);
export const IconUserCircle = wrap(Outline.UserCircle);
export const IconUser = wrap(Outline.User);
export const IconFolder = wrap(Outline.Folder);
export const IconFolderOpen = wrap(Outline.FolderOpen);
export const IconPhoto = wrap(Outline.Image);
export const IconFilm = wrap(Outline.VideoCamera);
export const IconMusicalNote = wrap(Outline.Music);
export const IconDocumentPdf = wrap(Outline.FilePdf);
export const IconEye = wrap(Outline.Eye);
export const IconUpload = wrap(Outline.Upload);
export const IconInfoCircle = wrap(Outline.InfoCircle);
export const IconLinkChain = wrap(Outline.Link);
export const IconGraph = wrap(Outline.ChartMixed);
export const IconSparkles = wrap(Outline.WandMagicSparkles);
export const IconArrowsExpand = wrap(Outline.Expand);
export const IconPlay = wrap(Outline.Play);
export const IconStop = wrap(Outline.Stop);
export const IconAdjustments = wrap(Outline.AdjustmentsHorizontal);
export const IconBolt = wrap(Outline.Fire);
export const IconCircleStack = wrap(Outline.Database);
export const IconCheckBadge = wrap(Outline.BadgeCheck);
export const IconShield = wrap(Outline.Shield);
export const IconKey = wrap(Outline.ApiKey);
export const IconLock = wrap(Outline.Lock);
export const IconExclamation = wrap(Outline.ExclamationCircle);
export const IconArrowRight = wrap(Outline.ArrowRight);
export const IconGlobe = wrap(Outline.Globe);
export const IconClock = wrap(Outline.Clock);
export const IconChevronRight = wrap(Outline.ChevronRight);
export const IconSend = wrap(Outline.PaperPlane);
export const IconTrendingUp = wrap(Outline.ChartLineUp);
export const IconChevronLeft = wrap(Outline.ChevronLeft);
export const IconChevronDown = wrap(Outline.ChevronDown);
export const IconChevronUp = wrap(Outline.ChevronUp);
export const IconLogout = wrap(Outline.ArrowRightToBracket);
export const IconShare = wrap(Outline.ShareNodes);
export const IconMinus = wrap(Outline.Minus);
export const IconBeaker = wrap(Outline.Microscope);
export const IconCube = wrap(Outline.Atom);
export const IconArrowsContract = wrap(Outline.Compress);
export const IconPause = wrap(Outline.Pause);
export const IconViewfinder = wrap(Outline.ZoomIn);
export const IconBookOpen = wrap(Outline.BookOpen);
export const IconChip = wrap(Outline.Atom);

// --- Solid Icons ---
export const IconCheckCircleFilled = wrap(Solid.CheckCircle);
export const IconStarFilled = wrap(Solid.Star);
