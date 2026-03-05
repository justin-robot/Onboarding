"use client";

import { CoreAdmin, Resource } from "ra-core";
import { dataProvider } from "./data-provider";
import { AdminLayout } from "./admin-layout";
import { DashboardOverview } from "./overview";
import { UserList } from "./users/list";
import { UserEdit } from "./users/edit";
import { UserCreate } from "./users/create";
import { WorkspaceList } from "./workspaces/list";
import { TaskList } from "./tasks/list";
import { MemberList } from "./members/list";
import { InvitationList } from "./invitations/list";
import { AuditLogList } from "./audit-logs/list";

const AdminClient = () => {
  return (
    <AdminLayout>
      <CoreAdmin dataProvider={dataProvider} dashboard={DashboardOverview}>
        <Resource
          name="users"
          list={UserList}
          edit={UserEdit}
          create={UserCreate}
        />
        <Resource
          name="workspaces"
          list={WorkspaceList}
        />
        <Resource
          name="tasks"
          list={TaskList}
        />
        <Resource
          name="members"
          list={MemberList}
        />
        <Resource
          name="invitations"
          list={InvitationList}
        />
        <Resource
          name="audit-logs"
          list={AuditLogList}
        />
      </CoreAdmin>
    </AdminLayout>
  );
};

export default AdminClient;
