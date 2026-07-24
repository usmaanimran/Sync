import { redirect } from 'next/navigation';

export default function HomePage() {
  // Instantly bounces anyone who visits the root URL straight to /login
  redirect('/login');
}