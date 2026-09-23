CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`pin_hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_unique` ON `users` (`name`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`note` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`user_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `operators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`margin_bp` integer DEFAULT 0 NOT NULL,
	`low_balance_at` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operators_name_unique` ON `operators` (`name`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operator_id` integer NOT NULL,
	`customer_id` integer,
	`target_phone` text NOT NULL,
	`amount` integer NOT NULL,
	`paid_amount` integer NOT NULL,
	`profit` integer NOT NULL,
	`user_id` integer NOT NULL,
	`voided_at` text,
	`void_reason` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`operator_id`) REFERENCES `operators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_created_idx` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `sales_customer_idx` ON `sales` (`customer_id`);--> statement-breakpoint
CREATE INDEX `sales_operator_idx` ON `sales` (`operator_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operator_id` integer NOT NULL,
	`type` text DEFAULT 'purchase' NOT NULL,
	`cost_amount` integer DEFAULT 0 NOT NULL,
	`credit_amount` integer NOT NULL,
	`note` text,
	`user_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`operator_id`) REFERENCES `operators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`details` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
