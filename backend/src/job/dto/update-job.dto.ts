import { PartialType } from "@nestjs/swagger";
import { CreatePushJobDto } from "./create-push-job.dto";
import { IsString } from "class-validator";
import { ConfigType } from "src/utils/interfaces";

export class UpdateJobDto extends PartialType(CreatePushJobDto) {
    @IsString()
    type: ConfigType;
}