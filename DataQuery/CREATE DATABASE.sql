CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS shelf_likes CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS shelf_items CASCADE;
DROP TABLE IF EXISTS shelves CASCADE;
DROP TABLE IF EXISTS media_items CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	username VARCHAR(50) NOT NULL UNIQUE, 
	email VARCHAR(100) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL, 
	avatar_url TEXT DEFAULT 'https://i.pinimg.com/736x/6c/0a/05/6c0a05a88d4dc79a696fc9a3c6aaba30.jpg',
	bio TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_items (
    id VARCHAR(100) PRIMARY KEY,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('BOOK', 'MOVIE')),
    title TEXT NOT NULL,
    creator TEXT,
    release_year VARCHAR(10),
    poster_url TEXT,
    overview TEXT,
    genres TEXT[], 
    average_rating NUMERIC(3, 2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shelves (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name VARCHAR(100) NOT NULL,
	description TEXT,
	shelf_wood VARCHAR(30) DEFAULT 'oak',
	is_public BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shelf_items (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
	media_id VARCHAR(100) NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
	added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT unique_shelf_media UNIQUE (shelf_id, media_id)
);

CREATE TABLE reviews (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	media_id VARCHAR(100) NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
	rating NUMERIC(3, 2) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
	content TEXT NOT NULL,
	contains_spoilers BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT unique_user_media_review UNIQUE (user_id, media_id)
);

CREATE TABLE shelf_likes (
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (user_id, shelf_id)
);