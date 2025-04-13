import { Route, Switch } from "wouter";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import CustomerDetails from "@/pages/customer-details";
import Tasks from "@/pages/tasks";
import Playbooks from "@/pages/playbooks";
import PlaybookWorkflow from "@/pages/playbooks/workflow";
import Reports from "@/pages/reports";
import CustomReports from "@/pages/custom-reports";
import RedZone from "@/pages/red-zone";
import Admin from "@/pages/admin";
import Achievements from "@/pages/achievements";
import Profile from "@/pages/profile";
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
        <Route path="/playbooks/workflow" component={PlaybookWorkflow} />
        <Route path="/reports" component={Reports} />
        <Route path="/custom-reports" component={CustomReports} />
        <Route path="/red-zone" component={RedZone} />
        <Route path="/admin" component={Admin} />
        <Route path="/achievements" component={Achievements} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default App;
