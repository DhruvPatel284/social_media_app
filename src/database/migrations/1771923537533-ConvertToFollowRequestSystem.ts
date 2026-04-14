import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertToFollowRequestSystem1771923537533 implements MigrationInterface {
    name = 'ConvertToFollowRequestSystem1771923537533'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_follows\` (\`id\` int NOT NULL AUTO_INCREMENT, \`status\` enum ('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`acceptedAt\` datetime NULL, \`followerId\` varchar(36) NULL, \`followingId\` varchar(36) NULL, UNIQUE INDEX \`IDX_48050dfc1d2514f4c2059f155e\` (\`followerId\`, \`followingId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_follows\` ADD CONSTRAINT \`FK_6300484b604263eaae8a6aab88d\` FOREIGN KEY (\`followerId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_follows\` ADD CONSTRAINT \`FK_7c6c27f12c4e972eab4b3aaccbf\` FOREIGN KEY (\`followingId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_follows\` DROP FOREIGN KEY \`FK_7c6c27f12c4e972eab4b3aaccbf\``);
        await queryRunner.query(`ALTER TABLE \`user_follows\` DROP FOREIGN KEY \`FK_6300484b604263eaae8a6aab88d\``);
        await queryRunner.query(`DROP INDEX \`IDX_48050dfc1d2514f4c2059f155e\` ON \`user_follows\``);
        await queryRunner.query(`DROP TABLE \`user_follows\``);
    }

}
