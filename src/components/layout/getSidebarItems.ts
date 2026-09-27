import {
  BarChart3,
  Bell,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  GraduationCap,
  Award,
  QrCode,
  Settings,
  Trophy,
  Upload,
  UserRound,
  Users,
} from "lucide-react";

export type SidebarChildItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export type SidebarGroup = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: SidebarChildItem[];
};

export function getSidebarGroups(role: string): SidebarGroup[] {
  if (role === "admin") {
    return [
      {
        label: "Tổng quan",
        icon: Gauge,
        items: [{ href: "/dashboard/admin", label: "Dashboard", icon: Gauge }],
      },
      {
        label: "Quản trị dữ liệu",
        icon: Users,
        items: [
          { href: "/dashboard/admin/users", label: "Người dùng", icon: Users },
          { href: "/dashboard/admin/students-import", label: "Import sinh viên", icon: Upload },
          { href: "/dashboard/admin/academic-terms", label: "Học kỳ", icon: GraduationCap },
        ],
      },
      {
        label: "Thiết lập xét duyệt",
        icon: ClipboardList,
        items: [
          { href: "/dashboard/admin/activities", label: "Hoạt động", icon: CalendarCheck2 },
          { href: "/dashboard/admin/conduct-score-frame", label: "Khung tiêu chuẩn ĐRL", icon: Award },
          { href: "/dashboard/admin/events", label: "Đợt xét", icon: Trophy },
          { href: "/dashboard/admin/criteria-templates", label: "Bộ tiêu chuẩn", icon: ClipboardList },
        ],
      },
      {
        label: "Hồ sơ xét duyệt",
        icon: ClipboardCheck,
        items: [
          { href: "/dashboard/admin/submissions", label: "Hồ sơ sinh viên", icon: ClipboardCheck },
          { href: "/dashboard/admin/officer-submissions", label: "Hồ sơ cán bộ", icon: ClipboardList },
          { href: "/dashboard/admin/officer-reviews", label: "Duyệt hồ sơ cán bộ", icon: Trophy },
        ],
      },
      {
        label: "Hệ thống",
        icon: Settings,
        items: [
          { href: "/dashboard/admin/reports", label: "Báo cáo", icon: BarChart3 },
          { href: "/dashboard/admin/audit-logs", label: "Nhật ký hệ thống", icon: ClipboardList },
          { href: "/dashboard/admin/settings", label: "Cài đặt", icon: Settings },
          { href: "/dashboard/admin/notifications", label: "Thông báo", icon: Bell },
        ],
      },
    ];
  }

  if (role === "faculty_officer") {
    return [
      {
        label: "Tổng quan",
        icon: Gauge,
        items: [{ href: "/dashboard/faculty-officer", label: "Dashboard", icon: Gauge }],
      },
      {
        label: "Theo dõi lớp",
        icon: GraduationCap,
        items: [
          { href: "/dashboard/faculty-officer/activities", label: "Hoạt động", icon: CalendarCheck2 },
          { href: "/dashboard/faculty-officer/checkin", label: "Điểm danh QR", icon: QrCode },
          { href: "/dashboard/faculty-officer/events", label: "Đợt xét", icon: Trophy },
          { href: "/dashboard/faculty-officer/submissions", label: "Hồ sơ", icon: ClipboardCheck },
          { href: "/dashboard/faculty-officer/reviews", label: "Duyệt vòng 2", icon: ClipboardList },
        ],
      },
      {
        label: "Tham gia cán bộ",
        icon: UserRound,
        items: [
          { href: "/dashboard/faculty-officer/officer-activities", label: "Hoạt động cán bộ", icon: CalendarCheck2 },
          { href: "/dashboard/faculty-officer/officer-events", label: "Đợt xét cán bộ", icon: Trophy },
          { href: "/dashboard/faculty-officer/officer-submissions", label: "Hồ sơ xét cán bộ", icon: ClipboardCheck },
          { href: "/dashboard/faculty-officer/notifications", label: "Thông báo", icon: Bell },
        ],
      },
      {
        label: "Tài khoản",
        icon: UserRound,
        items: [
          { href: "/dashboard/faculty-officer/profile", label: "Thông tin cá nhân", icon: UserRound },
        ],
      },
    ];
  }

  if (role === "class_officer") {
    return [
      {
        label: "Tổng quan",
        icon: Gauge,
        items: [{ href: "/dashboard/class-officer", label: "Dashboard", icon: Gauge }],
      },
      {
        label: "Theo dõi lớp",
        icon: GraduationCap,
        items: [
          { href: "/dashboard/class-officer/activities", label: "Hoạt động", icon: CalendarCheck2 },
          { href: "/dashboard/class-officer/events", label: "Đợt xét", icon: Trophy },
          { href: "/dashboard/class-officer/submissions", label: "Hồ sơ", icon: ClipboardCheck },
          { href: "/dashboard/class-officer/reviews", label: "Duyệt vòng 1", icon: ClipboardList },

        ],
      },
      {
        label: "Tham gia cán bộ",
        icon: UserRound,
        items: [
          { href: "/dashboard/class-officer/officer-activities", label: "Hoạt động cán bộ", icon: CalendarCheck2 },
          { href: "/dashboard/class-officer/officer-events", label: "Đợt xét cán bộ", icon: Trophy },
          { href: "/dashboard/class-officer/officer-submissions", label: "Hồ sơ xét cán bộ", icon: ClipboardCheck },
          { href: "/dashboard/class-officer/notifications", label: "Thông báo", icon: Bell },
        ],
      },
      {
        label: "Tài khoản",
        icon: UserRound,
        items: [
          { href: "/dashboard/class-officer/profile", label: "Thông tin cá nhân", icon: UserRound },
        ],
      },
    ];
  }

  return [
    {
      label: "Tổng quan",
      icon: Gauge,
      items: [{ href: "/dashboard/student", label: "Dashboard", icon: Gauge }],
    },
    {
      label: "Sinh viên",
      icon: GraduationCap,
      items: [
        { href: "/dashboard/student/activities", label: "Hoạt động", icon: CalendarCheck2 },
        { href: "/dashboard/student/conduct-score", label: "Điểm rèn luyện", icon: Award },
        { href: "/dashboard/student/events", label: "Đợt xét", icon: Trophy },
        { href: "/dashboard/student/submissions", label: "Hồ sơ xét", icon: ClipboardCheck },
        { href: "/dashboard/student/notifications", label: "Thông báo", icon: Bell },
      ],
    },
    {
      label: "Tài khoản",
      icon: UserRound,
      items: [
        { href: "/dashboard/student/profile", label: "Thông tin cá nhân", icon: UserRound },
      ],
    },
  ];
}
