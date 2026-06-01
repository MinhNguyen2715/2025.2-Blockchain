import { useHashRoute } from './lib/router';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Verify } from './pages/Verify';
import { Student } from './pages/Student';
import { University } from './pages/University';
import { Admin } from './pages/Admin';
import { Smoke } from './pages/Smoke';

export function App() {
  const path = useHashRoute();

  let page;
  switch (path) {
    case '/verify':
      page = <Verify />;
      break;
    case '/student':
      page = <Student />;
      break;
    case '/university':
      page = <University />;
      break;
    case '/admin':
      page = <Admin />;
      break;
    case '/smoke':
      page = <Smoke />;
      break;
    case '/':
    default:
      page = <Landing />;
      break;
  }

  return (
    <Layout path={path}>
      {page}
    </Layout>
  );
}
