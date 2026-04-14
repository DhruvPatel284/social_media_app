import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotifications1771415781469 implements MigrationInterface {
    name = 'AddNotifications1771415781469'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_follows\` (\`userId_1\` varchar(36) NOT NULL, \`userId_2\` varchar(36) NOT NULL, INDEX \`IDX_46ede43b9da5d9bc5714f162a6\` (\`userId_1\`), INDEX \`IDX_17ab1ce75231678fc5693548c5\` (\`userId_2\`), PRIMARY KEY (\`userId_1\`, \`userId_2\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_follows\` ADD CONSTRAINT \`FK_46ede43b9da5d9bc5714f162a6d\` FOREIGN KEY (\`userId_1\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`user_follows\` ADD CONSTRAINT \`FK_17ab1ce75231678fc5693548c51\` FOREIGN KEY (\`userId_2\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_follows\` DROP FOREIGN KEY \`FK_17ab1ce75231678fc5693548c51\``);
        await queryRunner.query(`ALTER TABLE \`user_follows\` DROP FOREIGN KEY \`FK_46ede43b9da5d9bc5714f162a6d\``);
        await queryRunner.query(`DROP INDEX \`IDX_17ab1ce75231678fc5693548c5\` ON \`user_follows\``);
        await queryRunner.query(`DROP INDEX \`IDX_46ede43b9da5d9bc5714f162a6\` ON \`user_follows\``);
        await queryRunner.query(`DROP TABLE \`user_follows\``);
    }

}
