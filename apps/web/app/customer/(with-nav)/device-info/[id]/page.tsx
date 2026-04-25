import CustomerDeviceInformation from '../../../../CustomerSide/CustomerDeviceInformation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <CustomerDeviceInformation deviceId={id} />;
}
