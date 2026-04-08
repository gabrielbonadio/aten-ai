import { importProvidersFrom } from '@angular/core';
import {
  AlertCircle,
  Bell,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Dog,
  LayoutDashboard,
  Loader,
  LucideAngularModule,
  Menu,
  Moon,
  PawPrint,
  Pencil,
  Search,
  Settings,
  Sun,
  Trash2,
  TriangleAlert,
  User,
  Users,
  X
} from 'lucide-angular';

/**
 * Registro global dos ícones Lucide usados no app (equivalente a um "provideLucideIcons").
 * lucide-angular não expõe `provideLucideIcons`; o padrão oficial é `LucideAngularModule.pick(...)`.
 */
export const lucideAppIconsProviders = importProvidersFrom(
  LucideAngularModule.pick({
    AlertCircle,
    Bell,
    Calendar,
    CalendarCheck,
    CalendarPlus,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    CircleCheck,
    Dog,
    LayoutDashboard,
    Loader,
    Menu,
    Moon,
    PawPrint,
    Pencil,
    Search,
    Settings,
    Sun,
    Trash2,
    TriangleAlert,
    User,
    Users,
    X
  })
);
