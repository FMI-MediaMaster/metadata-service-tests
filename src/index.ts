import request from 'supertest';
import { describe, it, expect } from 'vitest';

type TypeMap = {
    number: number;
    string: string;
    object: Record<string, any>;
    stringArray: string[];
    objectArray: Record<string, any>[];
};

export type Fields = Record<string, { type: keyof TypeMap }>;

type FromSchema<T extends Fields> = {
    [K in keyof T]: T[K]['type'] extends keyof TypeMap ? TypeMap[T[K]['type']] : unknown;
};

const runEndpointTests = <T extends Fields>(
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
            const requiredType = props['type'].includes('Array')
                ? 'object'
                : props['type'];
            expect(typeof item[key]).toBe(requiredType);
            if (!('empty' in props && props['empty'] === true)) {
                expect(item[key]).not.toBeNull();
            }
        }
    };
    const capitalize = (str: string) => `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

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
                    expect(body.error).toBe(`${capitalize(type)} not found`);
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
};


const runMetadataTests = (
    server: any,
    endpoint: string,
    {
        validMap,
        invalidMap,
        fieldsMap,
        type
    }: {
        validMap: object;
        invalidMap: object;
        fieldsMap: Record<string, Fields>;
        type: string;
    }
) => {
    const [first] = Object.entries(validMap);
    const destroyQuery = (method: string, key: string, value: string) => ({
        split: `${key[0]} ${key.slice(1)}=${value}`,
        duplicate: `${key[0].repeat(2)}${key}=${value}`,
    }[method] ?? `${key}=${value}`);

    type ObjectFn = typeof Object.keys | typeof Object.values;
    const buildConfig = (objectFn: ObjectFn, queryName: string) => {
        return {
            validItems: objectFn(validMap),
            nonExistentItems: objectFn(invalidMap),
            invalidQueries: ['split', 'duplicate'].map(m => destroyQuery(m, queryName, first[Number(queryName === 'id')])),
        };
    };

    const testsMap: object = {
        options: buildConfig(Object.keys, 'name'),
        info: buildConfig(Object.values, 'id'),
        recommendations: buildConfig(Object.values, 'id'),
    };

    const validMethods = Object.keys(fieldsMap);
    for (const [method, params] of Object.entries(testsMap)) {
        if (!validMethods.includes(method)) {
            continue;
        }
        runEndpointTests(server, `${endpoint}/${method}`, { ...params, fields: fieldsMap[method], type });
    }
};

export default runMetadataTests;
