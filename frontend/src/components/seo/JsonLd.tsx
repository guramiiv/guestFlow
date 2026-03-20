import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import type { SeoData, SeoRoom } from '@/types/public';

const PROPERTY_TYPE_MAP: Record<string, string> = {
  guesthouse: 'https://schema.org/BedAndBreakfast',
  hotel: 'https://schema.org/Hotel',
  apartment: 'https://schema.org/Apartment',
  villa: 'https://schema.org/House',
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Free WiFi',
  parking: 'Free Parking',
  breakfast: 'Breakfast Included',
  ac: 'Air Conditioning',
  garden: 'Garden',
  pool: 'Swimming Pool',
  balcony: 'Balcony',
  kitchen: 'Kitchen',
  tv: 'Television',
  heating: 'Heating',
  washer: 'Washing Machine',
  bbq: 'BBQ Facilities',
  pet_friendly: 'Pet Friendly',
  airport_transfer: 'Airport Transfer',
  minibar: 'Minibar',
};

const BED_MAP: Record<string, { typeOfBed: string; numberOfBeds: number | null }> = {
  single: { typeOfBed: 'Single', numberOfBeds: 1 },
  double: { typeOfBed: 'Double', numberOfBeds: 1 },
  twin: { typeOfBed: 'Single', numberOfBeds: 2 },
  family: { typeOfBed: 'Double', numberOfBeds: 1 },
  suite: { typeOfBed: 'King', numberOfBeds: 1 },
  dorm: { typeOfBed: 'Single', numberOfBeds: null }, // uses max_guests
};

function buildBedDetails(room: SeoRoom) {
  const bed = BED_MAP[room.room_type] ?? { typeOfBed: 'Double', numberOfBeds: 1 };
  return {
    '@type': 'BedDetails',
    typeOfBed: bed.typeOfBed,
    numberOfBeds: bed.numberOfBeds ?? room.max_guests,
  };
}

interface JsonLdProps {
  seoData: SeoData;
}

export default function JsonLd({ seoData }: JsonLdProps) {
  const jsonLd = useMemo(() => {
    const { property, rooms, pricing, stats, urls } = seoData;

    const additionalType =
      PROPERTY_TYPE_MAP[property.property_type] ?? 'https://schema.org/LodgingBusiness';

    const amenityFeature = property.amenities.map((code) => ({
      '@type': 'LocationFeatureSpecification',
      name: AMENITY_LABELS[code] ?? code,
      value: true,
    }));

    const makesOffer = rooms.map((room) => ({
      '@type': 'Offer',
      name: room.name_en || room.name_ka,
      ...(room.description_en ? { description: room.description_en } : {}),
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: room.effective_price_gel.toFixed(2),
        priceCurrency: 'GEL',
        unitCode: 'DAY',
      },
      availability: 'https://schema.org/InStock',
    }));

    const containsPlace = rooms.map((room) => ({
      '@type': 'HotelRoom',
      name: room.name_en || room.name_ka,
      ...(room.description_en ? { description: room.description_en } : {}),
      occupancy: {
        '@type': 'QuantitativeValue',
        maxValue: room.max_guests,
      },
      bed: buildBedDetails(room),
    }));

    const priceRange =
      pricing.min_price != null && pricing.max_price != null
        ? `₾${pricing.min_price} - ₾${pricing.max_price}`
        : undefined;

    const ld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      additionalType,
      name: property.name_en || property.name_ka,
      alternateName: property.name_ka,
      url: urls.canonical_url,
      telephone: property.phone || undefined,
      email: property.email || undefined,
    };

    if (property.description_en) {
      ld.description = property.description_en;
    }

    if (property.photos.length > 0) {
      ld.image = property.photos;
    }

    ld.address = {
      '@type': 'PostalAddress',
      streetAddress: property.address_ka,
      addressLocality: property.city,
      addressRegion: property.region,
      addressCountry: property.country,
    };

    if (property.latitude != null && property.longitude != null) {
      ld.geo = {
        '@type': 'GeoCoordinates',
        latitude: property.latitude,
        longitude: property.longitude,
      };
    }

    if (property.check_in_time) ld.checkinTime = property.check_in_time;
    if (property.check_out_time) ld.checkoutTime = property.check_out_time;

    if (priceRange) ld.priceRange = priceRange;
    ld.currenciesAccepted = 'GEL';
    ld.paymentAccepted = 'Cash, Credit Card';

    if (amenityFeature.length > 0) ld.amenityFeature = amenityFeature;
    ld.numberOfRooms = stats.total_rooms;

    if (stats.average_rating != null) {
      ld.starRating = {
        '@type': 'Rating',
        ratingValue: String(stats.average_rating),
      };
    }

    if (makesOffer.length > 0) ld.makesOffer = makesOffer;

    ld.potentialAction = {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${urls.booking_url}?checkin={checkinDate}&checkout={checkoutDate}&guests={numGuests}`,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      result: {
        '@type': 'LodgingReservation',
        name: 'Book a room',
      },
    };

    if (containsPlace.length > 0) ld.containsPlace = containsPlace;

    return ld;
  }, [seoData]);

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
