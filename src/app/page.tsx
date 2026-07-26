import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect unauthorized requests to authentication gateway
  redirect('/login');
}