CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`name` text NOT NULL,
	`cik` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_ticker_unique` ON `companies` (`ticker`);--> statement-breakpoint
CREATE UNIQUE INDEX `companies_cik_unique` ON `companies` (`cik`);--> statement-breakpoint
CREATE TABLE `company_facts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`metric` text NOT NULL,
	`concept` text NOT NULL,
	`unit` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`value` integer NOT NULL,
	`fiscal_year` integer,
	`fiscal_period` text,
	`form` text NOT NULL,
	`filed_date` text NOT NULL,
	`accession` text NOT NULL,
	`source_url` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_facts_concept_period_accession_uidx` ON `company_facts` (`company_id`,`concept`,`unit`,`period_start`,`period_end`,`accession`);--> statement-breakpoint
CREATE INDEX `company_facts_company_metric_period_end_idx` ON `company_facts` (`company_id`,`metric`,`period_end`);