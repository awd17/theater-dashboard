CREATE TABLE `upcoming_releases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movie_id` integer NOT NULL,
	`source` text NOT NULL,
	`region` text NOT NULL,
	`release_date` text NOT NULL,
	`release_type` text NOT NULL,
	`certification` text,
	`source_url` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upcoming_releases_source_movie_region_date_type_uidx` ON `upcoming_releases` (`source`,`movie_id`,`region`,`release_date`,`release_type`);--> statement-breakpoint
CREATE INDEX `upcoming_releases_release_date_idx` ON `upcoming_releases` (`release_date`);