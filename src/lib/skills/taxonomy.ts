/**
 * Canonical skill catalogue for the initial target roles
 * (software, DevOps, cloud, SRE, data, security, QA engineers).
 *
 * `slug` is the stable identifier. `aliases` are lowercased variants that should
 * normalise to the same canonical skill. This is intentionally hand-curated and
 * conservative — precision matters more than coverage for match scoring.
 */

export type SkillCategory =
  | "language"
  | "cloud"
  | "container"
  | "iac"
  | "cicd"
  | "observability"
  | "database"
  | "data"
  | "security"
  | "testing"
  | "os"
  | "networking"
  | "framework"
  | "practice";

export interface CanonicalSkill {
  slug: string;
  name: string;
  category: SkillCategory;
  aliases: string[];
}

export const SKILL_TAXONOMY: CanonicalSkill[] = [
  // Languages
  { slug: "python", name: "Python", category: "language", aliases: ["py", "python3"] },
  { slug: "go", name: "Go", category: "language", aliases: ["golang"] },
  { slug: "javascript", name: "JavaScript", category: "language", aliases: ["js", "es6"] },
  { slug: "typescript", name: "TypeScript", category: "language", aliases: ["ts"] },
  { slug: "java", name: "Java", category: "language", aliases: [] },
  { slug: "csharp", name: "C#", category: "language", aliases: ["c sharp", ".net", "dotnet"] },
  { slug: "ruby", name: "Ruby", category: "language", aliases: ["ruby on rails", "rails"] },
  { slug: "rust", name: "Rust", category: "language", aliases: [] },
  { slug: "bash", name: "Bash", category: "language", aliases: ["shell", "shell scripting", "sh"] },
  { slug: "sql", name: "SQL", category: "language", aliases: [] },
  { slug: "php", name: "PHP", category: "language", aliases: [] },
  { slug: "scala", name: "Scala", category: "language", aliases: [] },

  // Cloud
  {
    slug: "aws",
    name: "AWS",
    category: "cloud",
    aliases: ["amazon web services", "ec2", "amazon aws"],
  },
  { slug: "azure", name: "Azure", category: "cloud", aliases: ["microsoft azure", "az"] },
  {
    slug: "gcp",
    name: "GCP",
    category: "cloud",
    aliases: ["google cloud", "google cloud platform"],
  },
  { slug: "lambda", name: "AWS Lambda", category: "cloud", aliases: ["serverless", "faas"] },
  { slug: "cloudformation", name: "CloudFormation", category: "iac", aliases: ["cfn"] },

  // Containers / orchestration
  {
    slug: "docker",
    name: "Docker",
    category: "container",
    aliases: ["containers", "containerization", "containerisation"],
  },
  {
    slug: "kubernetes",
    name: "Kubernetes",
    category: "container",
    aliases: ["k8s", "kube", "eks", "aks", "gke"],
  },
  { slug: "helm", name: "Helm", category: "container", aliases: ["helm charts"] },
  { slug: "istio", name: "Istio", category: "container", aliases: ["service mesh"] },
  { slug: "openshift", name: "OpenShift", category: "container", aliases: ["ocp"] },

  // IaC / config mgmt
  { slug: "terraform", name: "Terraform", category: "iac", aliases: ["tf", "hcl", "opentofu"] },
  { slug: "ansible", name: "Ansible", category: "iac", aliases: [] },
  { slug: "pulumi", name: "Pulumi", category: "iac", aliases: [] },
  { slug: "packer", name: "Packer", category: "iac", aliases: [] },

  // CI/CD
  { slug: "jenkins", name: "Jenkins", category: "cicd", aliases: [] },
  {
    slug: "github-actions",
    name: "GitHub Actions",
    category: "cicd",
    aliases: ["gha", "github ci"],
  },
  { slug: "gitlab-ci", name: "GitLab CI", category: "cicd", aliases: ["gitlab pipelines"] },
  { slug: "argocd", name: "Argo CD", category: "cicd", aliases: ["argo cd", "gitops"] },
  { slug: "circleci", name: "CircleCI", category: "cicd", aliases: [] },

  // Observability
  { slug: "prometheus", name: "Prometheus", category: "observability", aliases: ["promql"] },
  { slug: "grafana", name: "Grafana", category: "observability", aliases: [] },
  { slug: "datadog", name: "Datadog", category: "observability", aliases: ["dd"] },
  { slug: "opentelemetry", name: "OpenTelemetry", category: "observability", aliases: ["otel"] },
  {
    slug: "elk",
    name: "ELK Stack",
    category: "observability",
    aliases: ["elasticsearch logstash kibana", "elastic stack"],
  },
  { slug: "splunk", name: "Splunk", category: "observability", aliases: [] },
  {
    slug: "pagerduty",
    name: "PagerDuty",
    category: "observability",
    aliases: ["on-call", "oncall"],
  },

  // Databases
  {
    slug: "postgresql",
    name: "PostgreSQL",
    category: "database",
    aliases: ["postgres", "psql", "pg"],
  },
  { slug: "mysql", name: "MySQL", category: "database", aliases: ["mariadb"] },
  { slug: "mongodb", name: "MongoDB", category: "database", aliases: ["mongo"] },
  { slug: "redis", name: "Redis", category: "database", aliases: ["elasticache"] },
  { slug: "dynamodb", name: "DynamoDB", category: "database", aliases: ["ddb"] },
  { slug: "kafka", name: "Apache Kafka", category: "data", aliases: ["kafka", "msk"] },
  { slug: "snowflake", name: "Snowflake", category: "data", aliases: [] },
  { slug: "spark", name: "Apache Spark", category: "data", aliases: ["pyspark", "spark"] },
  { slug: "airflow", name: "Apache Airflow", category: "data", aliases: ["airflow"] },
  { slug: "dbt", name: "dbt", category: "data", aliases: ["data build tool"] },

  // Security
  { slug: "iam", name: "IAM", category: "security", aliases: ["identity and access management"] },
  { slug: "siem", name: "SIEM", category: "security", aliases: [] },
  {
    slug: "pentesting",
    name: "Penetration Testing",
    category: "security",
    aliases: ["pen testing", "pen-testing", "offensive security"],
  },
  { slug: "owasp", name: "OWASP", category: "security", aliases: ["owasp top 10"] },
  {
    slug: "vulnerability-management",
    name: "Vulnerability Management",
    category: "security",
    aliases: ["vuln management", "patch management"],
  },
  {
    slug: "soc2",
    name: "SOC 2",
    category: "security",
    aliases: ["soc2", "iso 27001", "compliance"],
  },
  { slug: "zero-trust", name: "Zero Trust", category: "security", aliases: ["ztna"] },

  // Testing / QA
  { slug: "selenium", name: "Selenium", category: "testing", aliases: [] },
  { slug: "cypress", name: "Cypress", category: "testing", aliases: [] },
  { slug: "playwright", name: "Playwright", category: "testing", aliases: [] },
  { slug: "jest", name: "Jest", category: "testing", aliases: [] },
  { slug: "pytest", name: "pytest", category: "testing", aliases: [] },
  { slug: "junit", name: "JUnit", category: "testing", aliases: [] },
  {
    slug: "test-automation",
    name: "Test Automation",
    category: "testing",
    aliases: ["automated testing", "qa automation"],
  },
  {
    slug: "performance-testing",
    name: "Performance Testing",
    category: "testing",
    aliases: ["load testing", "jmeter", "k6", "gatling"],
  },

  // OS / networking
  {
    slug: "linux",
    name: "Linux",
    category: "os",
    aliases: ["unix", "rhel", "ubuntu", "centos", "debian"],
  },
  {
    slug: "networking",
    name: "Networking",
    category: "networking",
    aliases: ["tcp/ip", "dns", "load balancing", "vpc"],
  },
  { slug: "nginx", name: "NGINX", category: "networking", aliases: ["reverse proxy"] },

  // Frameworks
  { slug: "react", name: "React", category: "framework", aliases: ["reactjs", "react.js"] },
  { slug: "nextjs", name: "Next.js", category: "framework", aliases: ["next", "nextjs"] },
  { slug: "nodejs", name: "Node.js", category: "framework", aliases: ["node"] },
  { slug: "django", name: "Django", category: "framework", aliases: [] },
  { slug: "spring", name: "Spring", category: "framework", aliases: ["spring boot"] },

  // Practices
  {
    slug: "ci-cd",
    name: "CI/CD",
    category: "practice",
    aliases: ["continuous integration", "continuous delivery", "continuous deployment"],
  },
  {
    slug: "sre",
    name: "SRE",
    category: "practice",
    aliases: ["site reliability engineering", "slo", "sli", "error budget"],
  },
  { slug: "agile", name: "Agile", category: "practice", aliases: ["scrum", "kanban"] },
  {
    slug: "microservices",
    name: "Microservices",
    category: "practice",
    aliases: ["microservice architecture"],
  },
  {
    slug: "system-design",
    name: "System Design",
    category: "practice",
    aliases: ["distributed systems", "high availability"],
  },
  {
    slug: "incident-management",
    name: "Incident Management",
    category: "practice",
    aliases: ["incident response", "postmortem", "post-mortem"],
  },
];

export const SKILL_BY_SLUG = new Map(SKILL_TAXONOMY.map((s) => [s.slug, s]));
