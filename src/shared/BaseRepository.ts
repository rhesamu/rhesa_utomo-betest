import { Document, QueryFilter, Model, UpdateQuery } from 'mongoose';
import { NotFoundError } from '../core/errors/AppError';
import { FilterFieldConfig, parseListQuery } from './QueryBuilder';
import { Paginated } from './Paginated';

export abstract class BaseRepository<TDocument extends Document> {
  protected constructor(
    protected readonly model: Model<TDocument>,
    private readonly idField: string = '_id',
  ) {}

  protected async findMany(
    query: Record<string, unknown>,
    filterFields: FilterFieldConfig[],
    sortFields: string[],
    defaultSort: Record<string, 1 | -1> = { createdAt: -1 },
  ): Promise<Paginated<TDocument>> {
    const { filter, sort, skip, limit, page } = parseListQuery<TDocument>(
      query,
      filterFields,
      sortFields,
      defaultSort,
    );
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  protected async findOneById(id: string): Promise<TDocument> {
    const document = await this.model.findOne(this.idFilter(id)).exec();
    if (!document) {
      throw new NotFoundError(`${this.model.modelName} not found: ${id}`);
    }
    return document;
  }

  protected async createDocument(data: Partial<TDocument>): Promise<TDocument> {
    return this.model.create(data);
  }

  protected async updateOneById(id: string, data: UpdateQuery<TDocument>): Promise<TDocument> {
    const document = await this.model
      .findOneAndUpdate(this.idFilter(id), data, { new: true, runvalidators: true })
      .exec();

    if (!document) {
      throw new NotFoundError(`${this.model.modelName} not found: ${id}`);
    }
    return document;
  }

  protected async deleteOneById(id: string): Promise<void> {
    const result = await this.model.findOneAndDelete(this.idFilter(id)).exec();
    if (!result) {
      throw new NotFoundError(`${this.model.modelName} not found: ${id}`);
    }
  }

  private idFilter(id: string): QueryFilter<TDocument> {
    return { [this.idField]: id } as QueryFilter<TDocument>;
  }
}
