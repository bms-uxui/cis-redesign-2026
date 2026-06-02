import { useLocation, useNavigate } from "react-router";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Badge,
  Avatar,
} from "@heroui/react";
import {
  IconHome,
  IconHeartbeat,
  IconStethoscope,
  IconReceipt2,
  IconChartBar,
  IconSettings,
  IconSparkles,
  IconBellRinging,
  IconChevronDown,
  IconUserCircle,
  IconLogout,
  IconUser,
  IconHelp,
  IconUserPlus,
  IconClipboardList,
  IconVideo,
  IconShare3,
  IconStethoscope as IconStation,
  IconReportMedical,
  IconCash,
  IconFileInvoice,
  IconChartHistogram,
  IconBox,
  IconUsers,
  IconAdjustments,
} from "@tabler/icons-react";
import { useState } from "react";
import EHP_LOGO from "../assets/figma/ehp-logo.png";
import FullscreenButton from "./FullscreenButton";

interface AppNavbarProps {
  onOpenAiva?: () => void;
}

interface MenuGroup {
  key: string;
  label: string;
  icon: typeof IconHome;
  to?: string;
  /** Featured visual block shown on the left of the popover. */
  feature?: {
    title: string;
    description: string;
    /** Tailwind gradient classes for the feature tile background. */
    gradient: string;
    /** Large illustration icon. */
    Icon: typeof IconHome;
  };
  items?: {
    key: string;
    label: string;
    description?: string;
    icon: typeof IconHome;
    to: string;
  }[];
}

const MENU: MenuGroup[] = [
  {
    key: "home",
    label: "หน้าหลัก",
    icon: IconHome,
    to: "/",
  },
  {
    key: "patient",
    label: "ผู้ป่วย",
    icon: IconHeartbeat,
    feature: {
      title: "Patient Care",
      description:
        "บริการดูแลผู้ป่วยตั้งแต่ลงทะเบียน คิวตรวจ Telehealth ไปจนถึงการส่งต่อ",
      gradient: "from-violet-400 to-violet-600",
      Icon: IconHeartbeat,
    },
    items: [
      {
        key: "new",
        label: "ลงทะเบียนผู้ป่วยใหม่",
        description: "บันทึกด้วยเสียง / สแกนบัตร / กรอกฟอร์ม",
        icon: IconUserPlus,
        to: "/patient/new",
      },
      {
        key: "opd-queue",
        label: "คิว OPD",
        description: "รายชื่อผู้ป่วยรอตรวจวันนี้",
        icon: IconClipboardList,
        to: "/",
      },
      {
        key: "telehealth",
        label: "Telehealth",
        description: "พบแพทย์ออนไลน์",
        icon: IconVideo,
        to: "/",
      },
      {
        key: "referral",
        label: "ส่งต่อผู้ป่วย",
        description: "Referral ระหว่างโรงพยาบาล",
        icon: IconShare3,
        to: "/",
      },
    ],
  },
  {
    key: "clinical",
    label: "เวชกรรม",
    icon: IconStethoscope,
    feature: {
      title: "Clinical Care",
      description:
        "ห้องตรวจ หัตถการ Lab และเครื่องมือสรุปบันทึก SOAP อัตโนมัติ",
      gradient: "from-emerald-400 to-emerald-600",
      Icon: IconStethoscope,
    },
    items: [
      {
        key: "stations",
        label: "Service Stations",
        description: "ห้องตรวจ / หัตถการ / Lab",
        icon: IconStation,
        to: "/",
      },
      {
        key: "soap",
        label: "สรุป SOAP",
        description: "บันทึกการตรวจอัตโนมัติจากบทสนทนา",
        icon: IconReportMedical,
        to: "/soap",
      },
    ],
  },
  {
    key: "finance",
    label: "การเงิน",
    icon: IconReceipt2,
    feature: {
      title: "Finance",
      description:
        "ระบบรับชำระเงินและเบิกประกัน/สปสช. เชื่อมต่อกับ Visit อัตโนมัติ",
      gradient: "from-amber-400 to-amber-600",
      Icon: IconReceipt2,
    },
    items: [
      {
        key: "payment",
        label: "ชำระเงิน",
        description: "Cashier / รับชำระค่ารักษา",
        icon: IconCash,
        to: "/",
      },
      {
        key: "claims",
        label: "Claims",
        description: "เบิกประกัน / สปสช.",
        icon: IconFileInvoice,
        to: "/",
      },
    ],
  },
  {
    key: "insights",
    label: "ภาพรวม",
    icon: IconChartBar,
    feature: {
      title: "Insights",
      description:
        "Dashboard ผู้บริหาร รายงานเชิงลึก และคลังเวชภัณฑ์แบบ real-time",
      gradient: "from-rose-400 to-rose-600",
      Icon: IconChartHistogram,
    },
    items: [
      {
        key: "reports",
        label: "รายงาน",
        description: "Dashboard ผู้บริหาร",
        icon: IconChartHistogram,
        to: "/",
      },
      {
        key: "inventory",
        label: "คลังเวชภัณฑ์",
        description: "ยา / วัสดุ / อุปกรณ์",
        icon: IconBox,
        to: "/",
      },
    ],
  },
  {
    key: "system",
    label: "ระบบ",
    icon: IconSettings,
    feature: {
      title: "System",
      description:
        "การจัดการผู้ใช้งาน Role/Permission และการตั้งค่าระบบทั่วไป",
      gradient: "from-blue-400 to-blue-600",
      Icon: IconSettings,
    },
    items: [
      {
        key: "users",
        label: "ผู้ใช้งาน",
        description: "บัญชี / สิทธิ์ / Role",
        icon: IconUsers,
        to: "/",
      },
      {
        key: "settings",
        label: "ตั้งค่า",
        description: "การตั้งค่าระบบทั่วไป",
        icon: IconAdjustments,
        to: "/",
      },
    ],
  },
];

export default function AppNavbar({ onOpenAiva }: AppNavbarProps = {}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (group: MenuGroup) => {
    if (group.to) return pathname === group.to;
    if (group.items) return group.items.some((it) => pathname === it.to);
    return false;
  };

  return (
    <Navbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="full"
      classNames={{
        base: "bg-white border-b border-neutral-200",
        wrapper: "px-4 sm:px-6 max-w-none",
      }}
      height="60px"
    >
      {/* Brand + mobile toggle */}
      <NavbarContent justify="start" className="gap-3">
        <NavbarMenuToggle className="md:hidden" />
        <NavbarBrand className="flex-grow-0">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex shrink-0 items-center"
            aria-label="หน้าแรก"
          >
            <img
              src={EHP_LOGO}
              alt="Excellent Health Platform"
              className="h-9 w-auto shrink-0 object-contain"
            />
          </button>
        </NavbarBrand>
      </NavbarContent>

      {/* Center menu — desktop only */}
      <NavbarContent
        className="hidden gap-1 md:flex"
        justify="center"
      >
        {MENU.map((group) => {
          const active = isActive(group);
          const Icon = group.icon;
          if (!group.items) {
            return (
              <NavbarItem key={group.key} isActive={active}>
                <button
                  type="button"
                  onClick={() => group.to && navigate(group.to)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <Icon className="h-4 w-4" stroke={1.75} />
                  {group.label}
                </button>
              </NavbarItem>
            );
          }
          const FeatureIcon = group.feature?.Icon ?? Icon;
          return (
            <Popover
              key={group.key}
              placement="bottom-start"
              offset={12}
              backdrop="transparent"
              radius="lg"
              classNames={{
                content: "p-0 border border-neutral-200/80 shadow-[0_20px_50px_rgba(80,60,160,0.18)]",
              }}
            >
              <NavbarItem isActive={active}>
                <PopoverTrigger>
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" stroke={1.75} />
                    {group.label}
                    <IconChevronDown
                      className="h-3.5 w-3.5 opacity-60"
                      stroke={2}
                    />
                  </button>
                </PopoverTrigger>
              </NavbarItem>
              <PopoverContent>
                <div className="flex w-[640px] gap-4 p-3">
                  {/* Left — feature illustration tile */}
                  {group.feature && (
                    <button
                      type="button"
                      onClick={() => group.items?.[0] && navigate(group.items[0].to)}
                      className={`relative flex w-[240px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-left text-white transition hover:brightness-110 ${group.feature.gradient}`}
                    >
                      <FeatureIcon
                        className="absolute -bottom-4 -right-2 h-40 w-40 text-white/25"
                        stroke={1.25}
                      />
                      <FeatureIcon className="h-10 w-10" stroke={1.5} />
                      <div className="relative">
                        <div className="text-[15px] font-semibold leading-tight">
                          {group.feature.title}
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-white/85">
                          {group.feature.description}
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Right — item list with icon + label + description */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    {group.items.map((it) => {
                      const ItemIcon = it.icon;
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => navigate(it.to)}
                          className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-neutral-100"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                            <ItemIcon className="h-4 w-4" stroke={1.75} />
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="text-[14px] font-semibold text-neutral-900">
                              {it.label}
                            </span>
                            {it.description && (
                              <span className="text-[12px] leading-snug text-neutral-500">
                                {it.description}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </NavbarContent>

      {/* Right cluster — Aiva, fullscreen, notifications, profile */}
      <NavbarContent justify="end" className="gap-2">
        {onOpenAiva && (
          <NavbarItem>
            <Button
              isIconOnly
              variant="flat"
              radius="full"
              size="sm"
              className="bg-violet-100 text-violet-600 data-[hover=true]:bg-violet-200"
              onPress={onOpenAiva}
              aria-label="ถามเมย์ (Cmd K)"
            >
              <IconSparkles className="h-4 w-4" stroke={1.75} />
            </Button>
          </NavbarItem>
        )}

        <NavbarItem>
          <FullscreenButton
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
            iconClassName="h-4 w-4"
          />
        </NavbarItem>

        <NavbarItem>
          <Badge content="3" color="danger" size="sm" placement="top-right">
            <Button
              isIconOnly
              variant="light"
              radius="full"
              size="sm"
              className="text-neutral-600"
              aria-label="แจ้งเตือน"
            >
              <IconBellRinging className="h-4 w-4" stroke={1.75} />
            </Button>
          </Badge>
        </NavbarItem>

        <NavbarItem>
          <Dropdown placement="bottom-end" offset={8}>
            <DropdownTrigger>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full pl-1 pr-3 transition hover:bg-neutral-100"
                aria-label="โปรไฟล์"
              >
                <Avatar
                  size="sm"
                  isBordered
                  color="default"
                  className="h-8 w-8 bg-violet-100 text-violet-700"
                  icon={<IconUserCircle className="h-5 w-5" stroke={1.75} />}
                />
                <span className="hidden text-sm font-medium text-neutral-900 sm:inline">
                  นพ. ชารีฟ ราอูล
                </span>
              </button>
            </DropdownTrigger>
            <DropdownMenu aria-label="โปรไฟล์" className="min-w-[220px]">
              <DropdownSection title="บัญชี" showDivider>
                <DropdownItem
                  key="profile"
                  startContent={<IconUser className="h-4 w-4" stroke={1.75} />}
                >
                  โปรไฟล์ของฉัน
                </DropdownItem>
                <DropdownItem
                  key="settings"
                  startContent={<IconSettings className="h-4 w-4" stroke={1.75} />}
                >
                  ตั้งค่า
                </DropdownItem>
                <DropdownItem
                  key="help"
                  startContent={<IconHelp className="h-4 w-4" stroke={1.75} />}
                >
                  ช่วยเหลือ
                </DropdownItem>
              </DropdownSection>
              <DropdownSection>
                <DropdownItem
                  key="logout"
                  color="danger"
                  startContent={<IconLogout className="h-4 w-4" stroke={1.75} />}
                >
                  ออกจากระบบ
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>

      {/* Mobile drawer — flat list of all menu items + sub-items */}
      <NavbarMenu className="gap-1 pt-6">
        {MENU.flatMap((group) => {
          if (!group.items) {
            return [
              <NavbarMenuItem key={group.key}>
                <button
                  type="button"
                  onClick={() => {
                    if (group.to) navigate(group.to);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-neutral-800 hover:bg-neutral-100"
                >
                  <group.icon className="h-5 w-5" stroke={1.75} />
                  {group.label}
                </button>
              </NavbarMenuItem>,
            ];
          }
          return [
            <div
              key={`${group.key}-h`}
              className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              {group.label}
            </div>,
            ...group.items.map((it) => (
              <NavbarMenuItem key={it.key}>
                <button
                  type="button"
                  onClick={() => {
                    navigate(it.to);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
                >
                  <it.icon className="h-4 w-4 text-violet-500" stroke={1.75} />
                  {it.label}
                </button>
              </NavbarMenuItem>
            )),
          ];
        })}
      </NavbarMenu>
    </Navbar>
  );
}
