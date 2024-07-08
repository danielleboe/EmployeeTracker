// GIVEN a command-line application that accepts user input

const inquirer = require("inquirer");
const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

client.connect();

const mainMenu = () => {
  inquirer.prompt({
      // WHEN I start the application
      // THEN I am presented with the following options:
      // view all departments,
      // view all roles,
      // view all employees,
      // add a department,
      // add a role,
      // add an employee,
      // and update an employee role
      
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          "View All Departments",
          "View All Roles",
          "View All Employees",
          "Add a Department",
          "Add a Role",
          "Add an Employee",
          "Update Employee Role",
          "Exit",
        ]
      })
    .then((answer) => {
      switch (answer.action) {
        case "View All Departments":
          viewDepartments();
          break;
        case "View All Roles":
          viewRoles();
          break;
        case "View All Employees":
          viewEmployees();
          break;
        case "Add a Department":
          addDepartment();
          break;
        case "Add a Role":
          addRole();
          break;
        case "Add an Employee":
          addEmployee();
          break;
        case "Update Employee Role":
          updateEmployeeRole();
          break;
        case "Exit":
          client.end();
          break;
      }
    });
};

// WHEN I choose to view all departments
// THEN I am presented with a formatted table showing department names and department ids

const viewDepartments = () => {
  client.query("SELECT name, id FROM department", (err, res) => {
    if (err) throw err;
    console.table(res.rows);
    mainMenu();
  });
};

// WHEN I choose to view all roles
// THEN I am presented with the job title, role id, the department that role belongs to, and the salary for that role

const viewRoles = () => {
  client.query(
    "SELECT r.title, r.id, d.name as department, r.salary FROM role r JOIN department d on r.department_id = d.id",
    (err, res) => {
      if (err) throw err;
      console.table(res.rows);
      mainMenu();
    }
  );
};

// WHEN I choose to view all employees
// THEN I am presented with a formatted table showing employee data,
// including employee ids, first names, last names, job titles, departments, salaries, and managers that the employees report to
//why are  view roles and view employees formatted differently?

const viewEmployees = () => {
  const query = `
    SELECT e.id, e.first_name, e.last_name, r.title, d.name as department, r.salary, CONCAT(m.first_name, ' ', m.last_name) AS manager 
    FROM employee e 
    JOIN role r on r.id = e.role_id 
    JOIN department d on d.id = r.department_id 
    JOIN employee m on m.id = e.manager_id
            `;
  client.query(query, (err, res) => {
    if (err) throw err;
    console.table(res.rows);
    mainMenu();
  });
};

// WHEN I choose to add a department
// THEN I am prompted to enter the name of the department and that department is added to the database

const addDepartment = () => {
  inquirer.prompt({
      type: "input",
      name: "name",
      message: "Enter department name",
    }).then(answer => {
      client.query(
        'INSERT INTO department (name) VALUES ($1)',
        [answer.name], (err, res) => {
          if (err) throw err;
          console.log("Department added!");
          mainMenu();
        });
      });
  };

// WHEN I choose to add a role
// THEN I am prompted to enter the
// name,
// salary, and
// department for the role and
// that role is added to the database

const addRole = () => {
  client.query("SELECT * FROM department", (err, res) => {
    if (err) throw err;
    const departments = res.rows.map((department) => ({
      name: department.name,
      value: department.id,
    }));

    inquirer
      .prompt([
        {
          name: "title",
          type: "input",
          message: "Enter the name of the role:",
        },
        {
          name: "salary",
          type: "input",
          message: "Enter the salary for the role:",
        },
        {
          name: "department_id",
          type: "list",
          message: "Select the department for the role:",
          choices: departments,
        },
      ])
      .then((answers) => {
        const { title, salary, department_id } = answers;
        client.query(
          "INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)",
          [title, salary, department_id],
          (err, res) => {
            if (err) throw err;
            console.log("Role added!");
            mainMenu();
          }
        );
      });
  });
};

// WHEN I choose to add an employee
// THEN I am prompted to enter the employee’s first name, last name, role, and manager, and that employee is added to the database
const addEmployee = () => {
  client.query("SELECT * FROM role", (err, res) => {
    if (err) throw err;
    const roles = res.rows.map((role) => ({
      name: role.title,
      value: role.id,
    }));

    client.query("SELECT * FROM employee", (err, res) => {
      if (err) throw err;
      const managers = res.rows.map((manager) => ({
        name: `${manager.first_name} ${manager.last_name}`,
        value: manager.id,
      }));
      managers.push({ name: "None", value: null });

      inquirer
        .prompt([
          {
            name: "first_name",
            type: "input",
            message: "Enter the employee's first name:",
          },
          {
            name: "last_name",
            type: "input",
            message: "Enter the employee's last name:",
          },
          {
            name: "role_id",
            type: "list",
            message: "Select the employee's role:",
            choices: roles,
          },
          {
            name: "manager_id",
            type: "list",
            message: "Select the employee's manager:",
            choices: managers,
          },
        ])
        .then((answers) => {
          const { first_name, last_name, role_id, manager_id } = answers;
          client.query(
            "INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)",
            [first_name, last_name, role_id, manager_id],
            (err, res) => {
              if (err) throw err;
              console.log("Employee added!");
              mainMenu();
            }
          );
        });
    });
  });
};

// WHEN I choose to update an employee role
// THEN I am prompted to select an employee to update and their new role and this information is updated in the database
const updateEmployeeRole = () => {
  client.query("SELECT * FROM employee", (err, res) => {
    if (err) throw err;
    const employees = res.rows.map((employee) => ({
      name: `${employee.first_name} ${employee.last_name}`,
      value: employee.id,
    }));

    client.query("SELECT * FROM role", (err, res) => {
      if (err) throw err;
      const roles = res.rows.map((role) => ({
        name: role.title,
        value: role.id,
      }));

      inquirer
        .prompt([
          {
            name: "employee_id",
            type: "list",
            message: "Select the employee to update:",
            choices: employees,
          },
          {
            name: "role_id",
            type: "list",
            message: "Select the new role:",
            choices: roles,
          },
        ])
        .then((answers) => {
          const { employee_id, role_id } = answers;
          client.query(
            "UPDATE employee SET role_id = $1 WHERE id = $2",
            [role_id, employee_id],
            (err, res) => {
              if (err) throw err;
              console.log("Employee role updated!");
              mainMenu();
            }
          );
        });
    });
  });
};

//call the original prompt
mainMenu();
