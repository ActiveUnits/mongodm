<?php
  $connection = new Mongo();

  $db = $connection->nodebench2;
  $collection = $db->testData;

  // Basic find
  $results = $collection->find()->limit(100);
  $count = 0;
  foreach($results as $result)
  {
    $count += 1;
  }
  echo $count;
  
?>