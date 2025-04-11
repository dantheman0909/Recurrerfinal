import { Route, Switch } from "wouter";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import CustomerDetails from "@/pages/customer-details";
import Tasks from "@/pages/tasks";
import Playbooks from "@/pages/playbooks";
import Reports from "@/pages/reports";
import RedZone from "@/pages/red-zone";
import Admin from "@/pages/admin";
import AppLayout from "@/components/layouts/app-layout";

function App() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/customers/:id" component={CustomerDetails} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/playbooks" component={Playbooks} />
        <Route path="/reports" component={Reports} />
        <Route path="/red-zone" component={RedZone} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default App;
