// Test script to create a playbook through the /api/playbooks/workflow endpoint
const playbookData = {
  name: "Test Playbook with Conditions",
  description: "A test playbook with conditional tasks",
  trigger_type: "manual",
  target_segments: ["starter", "growth"],
  active: true,
  tasks: [
    {
      title: "Initial Task",
      description: "First task in the workflow",
      due_type: "relative",
      due_offset: 1,
      recurrence: "none",
      assignment_role: "csm",
      required_fields: ["comment"],
      template_message: "Hello {{customer_name}}, this is the first task",
      order: 1
    },
    {
      title: "Conditional Task",
      description: "This task has conditions",
      due_type: "relative",
      due_offset: 2,
      recurrence: "none",
      assignment_role: "csm",
      condition_field: {
        field: "health_status",
        operator: "equals",
        value: "at_risk"
      },
      required_fields: ["comment"],
      template_message: "This task will only execute for at-risk customers",
      order: 2
    }
  ]
};

// Print the data that will be sent
console.log("Sending playbook data:", JSON.stringify(playbookData, null, 2));

fetch('http://localhost:5000/api/playbooks/workflow', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(playbookData)
})
.then(response => {
  console.log("Response status:", response.status);
  return response.json();
})
.then(data => {
  console.log("Response data:", JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error("Error:", error);
});