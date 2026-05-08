import { Body, Controller, Post } from "@nestjs/common";

import { ContactService } from "./contact.service";
import { ContactMessageDto } from "./dto/contact-message.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  sendMessage(@Body() payload: ContactMessageDto) {
    return this.contactService.sendMessage(payload);
  }
}
