import AdminSmsGateway from '../../AdminSide/AdminSmsGateway';

export const metadata = {
  title: 'Semaphore SMS Gateway | Graphix Admin',
  description: 'Monitor Semaphore SMS gateway, credit balance, and test live DITO / Globe / Smart delivery'
};

export default function AdminSmsGatewayPage() {
  return <AdminSmsGateway />;
}

