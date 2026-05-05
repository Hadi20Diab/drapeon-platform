import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsUUID } from "class-validator";

import { CreateStoreDto } from "./dto/create-store.dto";
import { DesignersService } from "./designers.service";

class DesignerQueryDto {
  @IsUUID()
  designerId!: string;
}

@Controller("designers")
export class DesignersController {
  constructor(private readonly designersService: DesignersService) {}

  @Post("store")
  createStore(@Query() query: DesignerQueryDto, @Body() payload: CreateStoreDto) {
    return this.designersService.createStore(query.designerId, payload);
  }

  @Get("dashboard")
  getDashboard(@Query() query: DesignerQueryDto) {
    return this.designersService.getDashboard(query.designerId);
  }
}
