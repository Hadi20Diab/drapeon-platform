import { Controller, Get, Param, NotFoundException } from "@nestjs/common";

import { DesignersService } from "./designers.service";

@Controller("stores")
export class StoresController {
  constructor(private readonly designersService: DesignersService) {}

  @Get(":slug")
  async getPublicStore(@Param("slug") slug: string) {
    const designer = await this.designersService.findDesignerBySlug(slug);

    if (!designer) {
      throw new NotFoundException("Store not found");
    }

    return {
      slug: designer.slug,
      storeName: designer.storeName,
      location: designer.location ?? "Global atelier"
    };
  }
}
