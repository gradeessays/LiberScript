import { redirect } from 'next/navigation';

// Registration now starts from plan selection.
export default function SignUpPage() {
  redirect('/get-started');
}
