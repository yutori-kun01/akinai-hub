CREATE TABLE `line_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`user_id` text NOT NULL,
	`direction` text NOT NULL,
	`type` text NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`payload` text,
	`reply_token` text,
	`reply_expires` integer,
	`via` text,
	`read_at` integer,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `line_messages_user` ON `line_messages` (`owner`,`user_id`,`created`);--> statement-breakpoint
CREATE INDEX `line_messages_unread` ON `line_messages` (`owner`,`direction`,`read_at`);--> statement-breakpoint
ALTER TABLE `jobs` ADD `payload` text;