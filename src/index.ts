import request from 'supertest';
import { describe, it, expect } from 'vitest';

type TypeMap = {
    string: string;
    number: number;
    stringArray: string[];
    object: Record<string, any>;
};

type Fields = Record<string, { type: keyof TypeMap }>;

type FromSchema<T extends Fields> = {
    [K in keyof T]: T[K]['type'] extends keyof TypeMap ? TypeMap[T[K]['type']] : unknown;
};

export const runTests = <T extends Fields>(
    server: any,
    endpoint: string,
    {
        validItems,
        nonExistentItems,
        invalidQueries,
        fields,
        type
    }: {
        validItems: string[];
        nonExistentItems: string[];
        invalidQueries: string[];
        fields: T;
        type: string;
    }
) => {
    type Item = FromSchema<typeof fields>;
    const fieldKeys = Object.keys(fields);
    const queryType = endpoint.split('/').pop();
    const queryParameter = queryType === 'options' ? 'name' : 'id';
    const checkFields = (item: Item) => {
        expect(Object.keys(item)).toEqual(fieldKeys);

        for (const [key, props] of Object.entries(fields)) {
            expect(typeof item[key]).toBe(props['type']);
            if (!('empty' in props && props['empty'] === true)) {
                expect(item[key]).not.toBeNull();
            }
        }
    };

    describe(`GET /${queryType}`, async () => {
        validItems.forEach((item) => {
            it(`Query with valid ${type} '${item}' gives proper results`, async () => {
                const { body, status } = await request(server).get(`${endpoint}?${queryParameter}=${encodeURIComponent(item)}`);
                expect(status).toBe(200);

                if (queryType === 'info') {
                    expect(typeof body).toBe('object');
                    expect(body).not.toBeNull();
                    checkFields(body);
                } else {
                    expect(Array.isArray(body)).toBe(true);
                    expect(body.length).toBeGreaterThan(0);
                    (body as Item[]).forEach((item) => checkFields(item));
                }
            });
        });

        nonExistentItems.forEach((item) => {
            it(`Query with non-existent ${type} '${item}' gives empty result`, async () => {
                const { body, status } = await request(server).get(`${endpoint}?${queryParameter}=${encodeURIComponent(item)}`);

                if (queryType === 'info') {
                    expect(status).toBe(404);
                    expect(body).toHaveProperty('error');
                    expect(body.error).toBe(`${type} not found`);
                } else {
                    expect(status).toBe(200);
                    expect(Array.isArray(body)).toBe(true);
                    expect(body.length).toBe(0);
                }
            });
        });

        it('Error when no query', async () => {
            const { body, status } = await request(server).get(`${endpoint}`);
            expect(status).toBe(400);
            expect(body).toHaveProperty('error');
            expect(body.error).toBe(`Missing parameter for the ${queryType} endpoint`);
        });

        invalidQueries.forEach((query) => {
            it(`Error with query '${query}'`, async () => {
                const { body, status } = await request(server).get(`${endpoint}?${encodeURIComponent(query)}`);
                expect(status).toBe(400);
                expect(body).toHaveProperty('error');
                expect(body.error).toBe(`Missing parameter for the ${queryType} endpoint`);
            });
        });
    });
}
