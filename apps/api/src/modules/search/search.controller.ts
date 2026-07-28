import { Controller, Get, Query } from "@nestjs/common";
import { searchQuerySchema, type SearchQuery, type SearchResult } from "@vetclinic/contracts";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SearchService } from "./search.service";

/** Sin @Roles(): la búsqueda no expone datos clínicos, todos los roles la usan. */
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  find(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
  ): Promise<SearchResult[]> {
    return this.searchService.search(query.q);
  }
}
