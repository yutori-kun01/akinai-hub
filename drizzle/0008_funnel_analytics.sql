CREATE TABLE `conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`page_id` text NOT NULL,
	`parent_id` text NOT NULL,
	`visitor` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`order_id` text,
	`contact_id` text,
	`ref` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `conversions_owner` ON `conversions` (`owner`,`parent_id`,`created`);--> statement-breakpoint
CREATE TABLE `page_views` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`page_id` text NOT NULL,
	`parent_id` text NOT NULL,
	`visitor` text NOT NULL,
	`ref` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`medium` text DEFAULT '' NOT NULL,
	`campaign` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `page_views_owner` ON `page_views` (`owner`,`parent_id`,`created`);--> statement-breakpoint
CREATE INDEX `page_views_visitor` ON `page_views` (`owner`,`visitor`,`created`);