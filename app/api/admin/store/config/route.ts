// File: app/api/admin/store/config/route.ts
// Staff category and option-group browsing, admin category and attribute editing.
import { requireStoreAdmin, requireStoreStaff } from '@/lib/server/store-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import * as catalog from '@/lib/services/store/catalog';
import type { CategoryAttribute, CategorySummary } from '@/lib/services/store/types';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  const db = auth.db;
  try {
    const categoryRows = await db
      .prepare('SELECT id, name, slug, description, is_active, sort_order FROM store_categories ORDER BY sort_order ASC, name ASC')
      .all<{ id: string; name: string; slug: string; description: string; is_active: number; sort_order: number }>();
    const categories: CategorySummary[] = (categoryRows.results ?? []).map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      isActive: row.is_active === 1,
      sortOrder: Number(row.sort_order),
    }));
    const attributeRows = await db
      .prepare('SELECT id, category_id, name, slug, input_type, is_required, is_active, sort_order FROM category_attributes ORDER BY sort_order ASC, name ASC')
      .all<{ id: string; category_id: string; name: string; slug: string; input_type: string; is_required: number; is_active: number; sort_order: number }>();
    const attributes: CategoryAttribute[] = [];
    const attributeList = attributeRows.results ?? [];
    if (attributeList.length) {
      const ids = attributeList.map(attribute => attribute.id);
      const valueRows = await db
        .prepare(`SELECT id, attribute_id, value, label, swatch_color, sort_order FROM category_attribute_values WHERE attribute_id IN (${ids.map(() => '?').join(', ')}) ORDER BY sort_order ASC, value ASC`)
        .bind(...ids)
        .all<{ id: string; attribute_id: string; value: string; label: string; swatch_color: string | null; sort_order: number }>();
      const valuesByAttribute = new Map<string, CategoryAttribute['values']>();
      for (const value of valueRows.results ?? []) {
        const list = valuesByAttribute.get(value.attribute_id) ?? [];
        list.push({ id: value.id, value: value.value, label: value.label || value.value, swatchColor: value.swatch_color, sortOrder: Number(value.sort_order) });
        valuesByAttribute.set(value.attribute_id, list);
      }
      for (const attribute of attributeList) {
        attributes.push({
          id: attribute.id,
          categoryId: attribute.category_id,
          name: attribute.name,
          slug: attribute.slug,
          inputType: attribute.input_type === 'text' ? 'text' : 'select',
          isRequired: attribute.is_required === 1,
          isActive: attribute.is_active === 1,
          sortOrder: Number(attribute.sort_order),
          values: valuesByAttribute.get(attribute.id) ?? [],
        });
      }
    }
    return Response.json({ categories, attributes }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Catalog configuration could not be loaded.', 503);
  }
}

export async function PUT(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const categoryUpdates = (Array.isArray(body.categoryUpdates) ? body.categoryUpdates : []).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  const attributeSaves = (Array.isArray(body.attributeSaves) ? body.attributeSaves : []).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  const attributeDeletes = (Array.isArray(body.attributeDeletes) ? body.attributeDeletes : []).filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map(value => value.trim()).filter(value => value.length > 0);
  try {
    for (const update of categoryUpdates) {
      const id = cleanText(update.id, 100);
      if (!id) return jsonError('A category id is required for every update.', 400);
      const patch: { name?: string; description?: string; isActive?: boolean; sortOrder?: number } = {};
      if (update.name !== undefined) {
        const name = cleanText(update.name, 120);
        if (!name) return jsonError('A category name cannot be empty.', 400);
        patch.name = name;
      }
      if (update.description !== undefined) patch.description = cleanText(update.description, 1000);
      if (update.isActive !== undefined) patch.isActive = update.isActive === true;
      if (update.sortOrder !== undefined) {
        const sortOrder = Number(update.sortOrder);
        if (!Number.isInteger(sortOrder)) return jsonError('Sort order must be a whole number.', 400);
        patch.sortOrder = sortOrder;
      }
      if (Object.keys(patch).length === 0) return jsonError('Provide at least one field to update for each category.', 400);
      await catalog.saveCategory(id, patch);
    }
    for (const save of attributeSaves) {
      const categoryId = cleanText(save.categoryId, 100);
      const name = cleanText(save.name, 120);
      if (!categoryId) return jsonError('A category is required for every option group.', 400);
      if (!name) return jsonError('An option group name is required.', 400);
      const inputType = save.inputType === 'text' ? 'text' : save.inputType === 'select' ? 'select' : '';
      if (!inputType) return jsonError('The option group input type must be select or text.', 400);
      const sortOrder = Number(save.sortOrder);
      const values = (Array.isArray(save.values) ? save.values : [])
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map(item => ({
          id: cleanText(item.id, 100) || undefined,
          value: cleanText(item.value, 120),
          label: cleanText(item.label, 120) || cleanText(item.value, 120),
          swatchColor: cleanText(item.swatchColor, 40) || null,
        }))
        .filter(value => value.value);
      await catalog.saveCategoryAttribute(categoryId, {
        id: cleanText(save.id, 100) || undefined,
        name,
        slug: cleanText(save.slug, 80),
        inputType,
        isRequired: save.isRequired === true,
        isActive: save.isActive === true,
        sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
        values,
      });
    }
    for (const attributeId of attributeDeletes) {
      await catalog.deleteCategoryAttribute(attributeId);
    }
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Catalog configuration could not be saved.', 400);
  }
}
