
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Award, 
  BarChart3, 
  MessageSquare, 
  Calendar, 
  Settings,
  Target, // Ícone para Marketing
  Building2,
  FileText,
  Clock,
  DollarSign,
  Mail, // Ícone para Email Metrics
  TestTube // Ícone para Email Testing
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, href, isActive }) => (
  <Link
    to={href}
    className={cn(
      "flex items-center space-x-3 text-gray-700 dark:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
      isActive && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
    )}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </Link>
);

export const AdminSidebar: React.FC = () => {
  const location = useLocation();

  const sidebarItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: <Users size={20} />, label: 'Usuários', href: '/admin/users' },
    { icon: <BookOpen size={20} />, label: 'Cursos', href: '/admin/courses' },
    { icon: <GraduationCap size={20} />, label: 'Turmas', href: '/admin/classes' },
    { icon: <Award size={20} />, label: 'Certificados', href: '/admin/certificates' },
    { icon: <Target size={20} />, label: 'Marketing', href: '/admin/marketing' }, // Novo item
    { icon: <Mail size={20} />, label: 'Métricas de Email', href: '/admin/email-metrics' },
    { icon: <TestTube size={20} />, label: 'Teste de Email', href: '/admin/email-testing' },
    { icon: <BarChart3 size={20} />, label: 'Relatórios', href: '/admin/reports' },
    { icon: <MessageSquare size={20} />, label: 'Solicitações', href: '/admin/requests' },
    { icon: <Calendar size={20} />, label: 'Calendário', href: '/admin/calendar' },
    { icon: <Building2 size={20} />, label: 'Prestadores', href: '/admin/service-providers' },
    { icon: <FileText size={20} />, label: 'Documentos', href: '/admin/profiles' },
    { icon: <DollarSign size={20} />, label: 'Financeiro', href: '/admin/financial' },
    { icon: <Clock size={20} />, label: 'Salas', href: '/admin/rooms' },
    { icon: <Settings size={20} />, label: 'Configurações', href: '/admin/settings' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm p-4">
      <nav className="space-y-2">
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={location.pathname === item.href}
          />
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
