import request from 'supertest';
import { describe, it, expect } from 'vitest';

type TypeMap = {
    string: string;
    number: number;
    stringArray: string[];
};

type Fields = Record<string, { type: keyof TypeMap }>;

type FromSchema<T extends Fields> = {
    [K in keyof T]: T[K]['type'] extends keyof TypeMap ? TypeMap[T[K]['type']] : unknown;
};

export const describeOption = <T extends Fields>(
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
    type Option = FromSchema<typeof fields>;
    const fieldKeys = Object.keys(fields);

    describe('GET /options', async () => {
        endpoint = `${endpoint}/options`;

        validItems.forEach((name) => {
            it(`Valid ${type} '${name}' gives results`, async () => {
                const res = await request(server).get(`${endpoint}?name=${encodeURIComponent(name)}`);
                expect(res.status).toBe(200);
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toBeGreaterThan(0);

                (res.body as Option[]).forEach((item) => {
                    expect(Object.keys(item)).toEqual(fieldKeys);
                    for (const [key, props] of Object.entries(fields)) {
                        if (!('empty' in props && props['empty'] === true)) {
                            expect(item[key]).not.toBeNull();
                        }
                    }
                });
            });
        });

        nonExistentItems.forEach((name) => {
            it(`Non-existent ${type} '${name}' gives an empty array`, async () => {
                const res = await request(server).get(`${endpoint}?name=${encodeURIComponent(name)}`);
                expect(res.status).toBe(200);
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toBe(0);
            });
        });

        it('Error when no query', async () => {
            const res = await request(server).get(`${endpoint}`);
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toBe('Missing parameter for the options method');
        });

        invalidQueries.forEach((query) => {
            it(`Error with query '${query}'`, async () => {
                const res = await request(server).get(`${endpoint}?${encodeURIComponent(query)}`);
                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty('error');
                expect(res.body.error).toBe('Missing parameter for the options method');
            });
        });
    });
}
